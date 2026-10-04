import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravar } from '@/lib/outbox'
import { gravarLocal, lerLocal, novoId } from '@/lib/storage'
import type { Exercise, RoutineExercise, RoutineWithExercises } from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE = 'routines'

const SELECT_ROTINA = `
  *,
  routine_exercises (
    *,
    exercise:exercises (*)
  )
`

export interface DadosExercicioRotina {
  exercise_id: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  rest_seconds: number
  notes?: string | null
}

function ordenar(rotinas: RoutineWithExercises[]): RoutineWithExercises[] {
  return rotinas
    .map((r) => ({
      ...r,
      routine_exercises: [...(r.routine_exercises ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'))
}

export function useRoutines() {
  const { user } = useAuth()
  const [rotinas, setRotinas] = useState<RoutineWithExercises[]>(() =>
    lerLocal<RoutineWithExercises[]>(CHAVE, []),
  )
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!user) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('routines')
      .select(SELECT_ROTINA)
      .eq('user_id', user.id)

    if (error) {
      setErro(error.message)
    } else {
      const lista = ordenar((data ?? []) as unknown as RoutineWithExercises[])
      setRotinas(lista)
      gravarLocal(CHAVE, lista)
      setErro(null)
    }
    setCarregando(false)
  }, [user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const salvarCache = useCallback((lista: RoutineWithExercises[]) => {
    const ordenadas = ordenar(lista)
    setRotinas(ordenadas)
    gravarLocal(CHAVE, ordenadas)
    return ordenadas
  }, [])

  const criar = useCallback(
    async (name: string, notes: string | null = null) => {
      if (!user) throw new Error('Sessão não encontrada.')
      const agora = new Date().toISOString()
      const rotina: RoutineWithExercises = {
        id: novoId(),
        user_id: user.id,
        name: name.trim(),
        notes,
        position: rotinas.length,
        created_at: agora,
        updated_at: agora,
        routine_exercises: [],
      }
      salvarCache([...rotinas, rotina])
      const { routine_exercises: _ignorado, ...linha } = rotina
      await gravar({ tipo: 'insert', tabela: 'routines', dados: linha })
      return rotina
    },
    [user, rotinas, salvarCache],
  )

  const renomear = useCallback(
    async (id: string, name: string, notes: string | null) => {
      salvarCache(rotinas.map((r) => (r.id === id ? { ...r, name: name.trim(), notes } : r)))
      await gravar({ tipo: 'update', tabela: 'routines', id, dados: { name: name.trim(), notes } })
    },
    [rotinas, salvarCache],
  )

  const excluir = useCallback(
    async (id: string) => {
      salvarCache(rotinas.filter((r) => r.id !== id))
      // routine_exercises caem por ON DELETE CASCADE.
      await gravar({ tipo: 'delete', tabela: 'routines', id })
    },
    [rotinas, salvarCache],
  )

  const duplicar = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Sessão não encontrada.')
      const origem = rotinas.find((r) => r.id === id)
      if (!origem) throw new Error('Rotina não encontrada.')

      const agora = new Date().toISOString()
      const novaId = novoId()
      const itens: RoutineExercise[] = origem.routine_exercises.map((item, indice) => ({
        id: novoId(),
        routine_id: novaId,
        exercise_id: item.exercise_id,
        position: indice,
        target_sets: item.target_sets,
        target_reps_min: item.target_reps_min,
        target_reps_max: item.target_reps_max,
        rest_seconds: item.rest_seconds,
        notes: item.notes,
        created_at: agora,
      }))

      const copia: RoutineWithExercises = {
        id: novaId,
        user_id: user.id,
        name: `${origem.name} (cópia)`.slice(0, 60),
        notes: origem.notes,
        position: rotinas.length,
        created_at: agora,
        updated_at: agora,
        routine_exercises: itens.map((item, indice) => ({
          ...item,
          exercise: origem.routine_exercises[indice]!.exercise,
        })),
      }

      salvarCache([...rotinas, copia])
      const { routine_exercises: _ignorado, ...linha } = copia
      await gravar({ tipo: 'insert', tabela: 'routines', dados: linha })
      if (itens.length > 0) {
        for (const item of itens) {
          await gravar({ tipo: 'insert', tabela: 'routine_exercises', dados: item })
        }
      }
      return copia
    },
    [user, rotinas, salvarCache],
  )

  /**
   * `catalogo` traz o exercício completo para montar o cache otimista sem
   * precisar de uma nova consulta — essencial para funcionar offline.
   */
  const adicionarExercicios = useCallback(
    async (
      routineId: string,
      novos: DadosExercicioRotina[],
      catalogo: Map<string, Exercise>,
    ) => {
      const rotina = rotinas.find((r) => r.id === routineId)
      if (!rotina) throw new Error('Rotina não encontrada.')
      const agora = new Date().toISOString()
      const base = rotina.routine_exercises.length

      const itens: RoutineExercise[] = novos.map((dados, indice) => ({
        id: novoId(),
        routine_id: routineId,
        exercise_id: dados.exercise_id,
        position: base + indice,
        target_sets: dados.target_sets,
        target_reps_min: dados.target_reps_min,
        target_reps_max: dados.target_reps_max,
        rest_seconds: dados.rest_seconds,
        notes: dados.notes ?? null,
        created_at: agora,
      }))

      salvarCache(
        rotinas.map((r) =>
          r.id === routineId
            ? {
                ...r,
                routine_exercises: [
                  ...r.routine_exercises,
                  ...itens.flatMap((item) => {
                    const exercise = catalogo.get(item.exercise_id)
                    return exercise ? [{ ...item, exercise }] : []
                  }),
                ],
              }
            : r,
        ),
      )

      for (const item of itens) {
        await gravar({ tipo: 'insert', tabela: 'routine_exercises', dados: item })
      }
      return itens
    },
    [rotinas, salvarCache],
  )

  const atualizarExercicio = useCallback(
    async (routineId: string, itemId: string, dados: Partial<DadosExercicioRotina>) => {
      salvarCache(
        rotinas.map((r) =>
          r.id === routineId
            ? {
                ...r,
                routine_exercises: r.routine_exercises.map((item) =>
                  item.id === itemId ? { ...item, ...dados } : item,
                ),
              }
            : r,
        ),
      )
      await gravar({ tipo: 'update', tabela: 'routine_exercises', id: itemId, dados })
    },
    [rotinas, salvarCache],
  )

  const removerExercicio = useCallback(
    async (routineId: string, itemId: string) => {
      salvarCache(
        rotinas.map((r) =>
          r.id === routineId
            ? {
                ...r,
                routine_exercises: r.routine_exercises
                  .filter((item) => item.id !== itemId)
                  .map((item, indice) => ({ ...item, position: indice })),
              }
            : r,
        ),
      )
      await gravar({ tipo: 'delete', tabela: 'routine_exercises', id: itemId })
    },
    [rotinas, salvarCache],
  )

  /** Persiste a nova ordem após arrastar/reordenar. */
  const reordenarExercicios = useCallback(
    async (routineId: string, idsNaOrdem: string[]) => {
      salvarCache(
        rotinas.map((r) =>
          r.id === routineId
            ? {
                ...r,
                routine_exercises: r.routine_exercises.map((item) => ({
                  ...item,
                  position: Math.max(0, idsNaOrdem.indexOf(item.id)),
                })),
              }
            : r,
        ),
      )
      for (const [indice, id] of idsNaOrdem.entries()) {
        await gravar({
          tipo: 'update',
          tabela: 'routine_exercises',
          id,
          dados: { position: indice },
        })
      }
    },
    [rotinas, salvarCache],
  )

  return {
    rotinas,
    carregando,
    erro,
    criar,
    renomear,
    excluir,
    duplicar,
    adicionarExercicios,
    atualizarExercicio,
    removerExercicio,
    reordenarExercicios,
    recarregar: carregar,
  }
}
