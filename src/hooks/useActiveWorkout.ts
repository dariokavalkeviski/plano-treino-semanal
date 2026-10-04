import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravar } from '@/lib/outbox'
import { gravarLocal, lerLocal, novoId, removerLocal } from '@/lib/storage'
import { estimar1RM } from '@/lib/format'
import type {
  Exercise,
  LastSetRow,
  RoutineWithExercises,
  WorkoutSet,
} from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE = 'treino-ativo'

export interface SerieAtiva {
  id: string
  numero: number
  peso: number
  reps: number
  concluida: boolean
  /** Referência do último treino, para o usuário saber o que fez na última vez. */
  referencia: { peso: number; reps: number } | null
  /** Marcada quando esta série superou o recorde pessoal do exercício. */
  recorde: boolean
}

export interface ExercicioAtivo {
  routineExerciseId: string | null
  exercise: Exercise
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number
  series: SerieAtiva[]
}

export interface TreinoAtivo {
  id: string
  userId: string
  routineId: string | null
  nome: string
  iniciadoEm: string
  exercicios: ExercicioAtivo[]
  /** Recorde conhecido por exercício no início do treino (kg). */
  recordesIniciais: Record<string, number>
}

export interface ResumoTreino {
  nome: string
  duracaoSegundos: number
  seriesConcluidas: number
  volumeKg: number
  repsTotais: number
  recordes: { exercicio: string; peso: number; reps: number }[]
  exerciciosTrabalhados: number
}

function serieVazia(numero: number, referencia: { peso: number; reps: number } | null): SerieAtiva {
  return {
    id: novoId(),
    numero,
    // Pré-preenche com a última carga: no treino, o usuário só ajusta o que mudou.
    peso: referencia?.peso ?? 0,
    reps: referencia?.reps ?? 0,
    concluida: false,
    referencia,
    recorde: false,
  }
}

/**
 * Sessão de treino em andamento.
 *
 * O estado inteiro mora no localStorage: dá para fechar o app, perder a
 * internet no meio do treino e continuar de onde parou. As séries vão para o
 * Supabase pela outbox conforme são marcadas.
 */
export function useActiveWorkout() {
  const { user } = useAuth()
  const [treino, setTreino] = useState<TreinoAtivo | null>(() =>
    lerLocal<TreinoAtivo | null>(CHAVE, null),
  )
  const [agora, setAgora] = useState(() => Date.now())

  // Mantém o cronômetro de duração total vivo enquanto há treino aberto.
  useEffect(() => {
    if (!treino) return
    const intervalo = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(intervalo)
  }, [treino])

  // Descarta um treino que pertença a outra conta (troca de usuário no aparelho).
  useEffect(() => {
    if (treino && user && treino.userId !== user.id) {
      removerLocal(CHAVE)
      setTreino(null)
    }
  }, [treino, user])

  const persistir = useCallback((proximo: TreinoAtivo | null) => {
    setTreino(proximo)
    if (proximo) gravarLocal(CHAVE, proximo)
    else removerLocal(CHAVE)
  }, [])

  const duracaoSegundos = useMemo(() => {
    if (!treino) return 0
    return Math.max(0, Math.floor((agora - new Date(treino.iniciadoEm).getTime()) / 1000))
  }, [treino, agora])

  /** Inicia o treino a partir de uma rotina, buscando referências e recordes. */
  const iniciar = useCallback(
    async (rotina: RoutineWithExercises) => {
      if (!user) throw new Error('Sessão não encontrada.')
      if (rotina.routine_exercises.length === 0) {
        throw new Error('Adicione exercícios à rotina antes de iniciar.')
      }

      const ids = rotina.routine_exercises.map((item) => item.exercise_id)
      const referencias = new Map<string, Map<number, { peso: number; reps: number }>>()
      const recordes: Record<string, number> = {}

      // Offline, o treino começa sem referência — o resto funciona igual.
      if (navigator.onLine) {
        const [ultimas, prs] = await Promise.all([
          supabase.rpc('last_sets_for_exercises', { p_exercise_ids: ids }),
          supabase.from('personal_records').select('exercise_id, weight_kg').in('exercise_id', ids),
        ])

        for (const linha of (ultimas.data ?? []) as LastSetRow[]) {
          const porSerie = referencias.get(linha.exercise_id) ?? new Map()
          porSerie.set(linha.set_number, { peso: Number(linha.weight_kg), reps: linha.reps })
          referencias.set(linha.exercise_id, porSerie)
        }
        for (const linha of (prs.data ?? []) as { exercise_id: string; weight_kg: number }[]) {
          recordes[linha.exercise_id] = Number(linha.weight_kg)
        }
      }

      const novo: TreinoAtivo = {
        id: novoId(),
        userId: user.id,
        routineId: rotina.id,
        nome: rotina.name,
        iniciadoEm: new Date().toISOString(),
        recordesIniciais: recordes,
        exercicios: rotina.routine_exercises.map((item) => {
          const porSerie = referencias.get(item.exercise_id)
          return {
            routineExerciseId: item.id,
            exercise: item.exercise,
            targetSets: item.target_sets,
            targetRepsMin: item.target_reps_min,
            targetRepsMax: item.target_reps_max,
            restSeconds: item.rest_seconds,
            series: Array.from({ length: item.target_sets }, (_, i) =>
              serieVazia(i + 1, porSerie?.get(i + 1) ?? porSerie?.get(1) ?? null),
            ),
          }
        }),
      }

      // O registro do treino é criado já no início: se o app fechar, o
      // histórico tem a sessão e as séries enviadas até ali.
      await gravar({
        tipo: 'insert',
        tabela: 'workouts',
        dados: {
          id: novo.id,
          user_id: user.id,
          routine_id: rotina.id,
          name: rotina.name,
          started_at: novo.iniciadoEm,
        },
      })

      persistir(novo)
      return novo
    },
    [user, persistir],
  )

  const ajustarSerie = useCallback(
    (exercicioIndice: number, serieId: string, campos: Partial<Pick<SerieAtiva, 'peso' | 'reps'>>) => {
      if (!treino) return
      persistir({
        ...treino,
        exercicios: treino.exercicios.map((ex, i) =>
          i === exercicioIndice
            ? {
                ...ex,
                series: ex.series.map((s) => (s.id === serieId ? { ...s, ...campos } : s)),
              }
            : ex,
        ),
      })
    },
    [treino, persistir],
  )

  /**
   * Marca a série como concluída e grava.
   * Retorna `recorde: true` quando a carga supera o recorde do exercício, para
   * a tela dar o feedback visual.
   */
  const concluirSerie = useCallback(
    async (exercicioIndice: number, serieId: string): Promise<{ recorde: boolean }> => {
      if (!treino || !user) return { recorde: false }
      const exercicio = treino.exercicios[exercicioIndice]
      const serie = exercicio?.series.find((s) => s.id === serieId)
      if (!exercicio || !serie) return { recorde: false }

      const recordeAtual = treino.recordesIniciais[exercicio.exercise.id] ?? 0
      const ehRecorde = serie.peso > 0 && serie.reps > 0 && serie.peso > recordeAtual

      const atualizado: TreinoAtivo = {
        ...treino,
        recordesIniciais: ehRecorde
          ? { ...treino.recordesIniciais, [exercicio.exercise.id]: serie.peso }
          : treino.recordesIniciais,
        exercicios: treino.exercicios.map((ex, i) =>
          i === exercicioIndice
            ? {
                ...ex,
                series: ex.series.map((s) =>
                  s.id === serieId ? { ...s, concluida: true, recorde: ehRecorde } : s,
                ),
              }
            : ex,
        ),
      }
      persistir(atualizado)

      const linha: Omit<WorkoutSet, 'id'> & { id: string } = {
        id: serie.id,
        workout_id: treino.id,
        exercise_id: exercicio.exercise.id,
        user_id: user.id,
        set_number: serie.numero,
        weight_kg: serie.peso,
        reps: serie.reps,
        done: true,
        performed_at: new Date().toISOString(),
      }
      await gravar({
        tipo: 'upsert',
        tabela: 'workout_sets',
        dados: linha,
        onConflict: 'workout_id,exercise_id,set_number',
      })

      return { recorde: ehRecorde }
    },
    [treino, user, persistir],
  )

  const desfazerSerie = useCallback(
    async (exercicioIndice: number, serieId: string) => {
      if (!treino) return
      persistir({
        ...treino,
        exercicios: treino.exercicios.map((ex, i) =>
          i === exercicioIndice
            ? {
                ...ex,
                series: ex.series.map((s) =>
                  s.id === serieId ? { ...s, concluida: false, recorde: false } : s,
                ),
              }
            : ex,
        ),
      })
      await gravar({ tipo: 'delete', tabela: 'workout_sets', id: serieId })
    },
    [treino, persistir],
  )

  /** Série extra além do alvo da rotina. */
  const adicionarSerie = useCallback(
    (exercicioIndice: number) => {
      if (!treino) return
      persistir({
        ...treino,
        exercicios: treino.exercicios.map((ex, i) => {
          if (i !== exercicioIndice) return ex
          const ultima = ex.series[ex.series.length - 1]
          return {
            ...ex,
            series: [
              ...ex.series,
              serieVazia(
                ex.series.length + 1,
                ultima ? { peso: ultima.peso, reps: ultima.reps } : null,
              ),
            ],
          }
        }),
      })
    },
    [treino, persistir],
  )

  const removerSerie = useCallback(
    async (exercicioIndice: number, serieId: string) => {
      if (!treino) return
      const serie = treino.exercicios[exercicioIndice]?.series.find((s) => s.id === serieId)
      persistir({
        ...treino,
        exercicios: treino.exercicios.map((ex, i) =>
          i === exercicioIndice
            ? {
                ...ex,
                series: ex.series
                  .filter((s) => s.id !== serieId)
                  .map((s, indice) => ({ ...s, numero: indice + 1 })),
              }
            : ex,
        ),
      })
      if (serie?.concluida) {
        await gravar({ tipo: 'delete', tabela: 'workout_sets', id: serieId })
      }
    },
    [treino, persistir],
  )

  const resumo = useMemo<ResumoTreino | null>(() => {
    if (!treino) return null
    let seriesConcluidas = 0
    let volumeKg = 0
    let repsTotais = 0
    const recordes: ResumoTreino['recordes'] = []
    const exerciciosComSerie = new Set<string>()

    for (const ex of treino.exercicios) {
      for (const s of ex.series) {
        if (!s.concluida) continue
        seriesConcluidas++
        volumeKg += s.peso * s.reps
        repsTotais += s.reps
        exerciciosComSerie.add(ex.exercise.id)
        if (s.recorde) {
          recordes.push({ exercicio: ex.exercise.name, peso: s.peso, reps: s.reps })
        }
      }
    }

    return {
      nome: treino.nome,
      duracaoSegundos,
      seriesConcluidas,
      volumeKg,
      repsTotais,
      recordes,
      exerciciosTrabalhados: exerciciosComSerie.size,
    }
  }, [treino, duracaoSegundos])

  /** Fecha a sessão: grava finished_at/duração e limpa o estado local. */
  const finalizar = useCallback(async (): Promise<ResumoTreino | null> => {
    if (!treino) return null
    const final = resumo
    await gravar({
      tipo: 'update',
      tabela: 'workouts',
      id: treino.id,
      dados: {
        finished_at: new Date().toISOString(),
        duration_seconds: duracaoSegundos,
      },
    })
    persistir(null)
    return final
  }, [treino, resumo, duracaoSegundos, persistir])

  /** Descarta o treino sem salvar (apaga a sessão e as séries no servidor). */
  const descartar = useCallback(async () => {
    if (!treino) return
    await gravar({ tipo: 'delete', tabela: 'workouts', id: treino.id })
    persistir(null)
  }, [treino, persistir])

  const progresso = useMemo(() => {
    if (!treino) return { feitas: 0, total: 0, percentual: 0 }
    const total = treino.exercicios.reduce((soma, ex) => soma + ex.series.length, 0)
    const feitas = treino.exercicios.reduce(
      (soma, ex) => soma + ex.series.filter((s) => s.concluida).length,
      0,
    )
    return { feitas, total, percentual: total === 0 ? 0 : Math.round((feitas / total) * 100) }
  }, [treino])

  return {
    treino,
    duracaoSegundos,
    progresso,
    resumo,
    iniciar,
    ajustarSerie,
    concluirSerie,
    desfazerSerie,
    adicionarSerie,
    removerSerie,
    finalizar,
    descartar,
  }
}

/** Compara duas séries por 1RM estimado — usado para destacar a melhor. */
export function melhorSerie(a: SerieAtiva, b: SerieAtiva): SerieAtiva {
  return estimar1RM(a.peso, a.reps) >= estimar1RM(b.peso, b.reps) ? a : b
}
