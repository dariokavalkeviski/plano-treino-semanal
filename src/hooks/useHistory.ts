import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravarLocal, lerLocal } from '@/lib/storage'
import { deDataISO, diferencaEmDias, paraDataISO } from '@/lib/format'
import type { PersonalRecord, Workout, WeeklyStatRow } from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE_TREINOS = 'historico-treinos'

export interface TreinoNoHistorico extends Workout {
  series: number
  volume_kg: number
}

/** Histórico de treinos concluídos + sequência (streak) de dias. */
export function useHistory() {
  const { user } = useAuth()
  const [treinos, setTreinos] = useState<TreinoNoHistorico[]>(() =>
    lerLocal<TreinoNoHistorico[]>(CHAVE_TREINOS, []),
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
      .from('workouts')
      .select('*, workout_sets (weight_kg, reps, done)')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(400)

    if (error) {
      setErro(error.message)
    } else {
      type Linha = Workout & { workout_sets: { weight_kg: number; reps: number; done: boolean }[] }
      const lista: TreinoNoHistorico[] = ((data ?? []) as unknown as Linha[]).map((w) => {
        const feitas = (w.workout_sets ?? []).filter((s) => s.done)
        return {
          ...w,
          series: feitas.length,
          volume_kg: feitas.reduce((soma, s) => soma + Number(s.weight_kg) * s.reps, 0),
        }
      })
      setTreinos(lista)
      gravarLocal(CHAVE_TREINOS, lista)
      setErro(null)
    }
    setCarregando(false)
  }, [user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /** Conjunto de dias com treino, em 'YYYY-MM-DD', para pintar o calendário. */
  const diasTreinados = useMemo(() => {
    return new Set(treinos.map((t) => paraDataISO(new Date(t.started_at))))
  }, [treinos])

  /**
   * Sequência atual de dias treinados. Conta de hoje para trás; se ainda não
   * treinou hoje, a sequência que terminou ontem continua valendo.
   */
  const sequencia = useMemo(() => {
    if (diasTreinados.size === 0) return 0
    const hoje = new Date()
    const treinouHoje = diasTreinados.has(paraDataISO(hoje))
    let cursor = new Date(hoje)
    if (!treinouHoje) {
      cursor.setDate(cursor.getDate() - 1)
      if (!diasTreinados.has(paraDataISO(cursor))) return 0
    }
    let total = 0
    while (diasTreinados.has(paraDataISO(cursor))) {
      total++
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
    }
    return total
  }, [diasTreinados])

  const maiorSequencia = useMemo(() => {
    const dias = [...diasTreinados].sort()
    let melhor = 0
    let atual = 0
    let anterior: Date | null = null
    for (const dia of dias) {
      const d = deDataISO(dia)
      if (anterior && diferencaEmDias(d, anterior) === 1) atual++
      else atual = 1
      melhor = Math.max(melhor, atual)
      anterior = d
    }
    return melhor
  }, [diasTreinados])

  const totais = useMemo(() => {
    const volume = treinos.reduce((soma, t) => soma + t.volume_kg, 0)
    const series = treinos.reduce((soma, t) => soma + t.series, 0)
    const minutos = treinos.reduce((soma, t) => soma + (t.duration_seconds ?? 0) / 60, 0)
    return { treinos: treinos.length, volume, series, minutos: Math.round(minutos) }
  }, [treinos])

  return {
    treinos,
    diasTreinados,
    sequencia,
    maiorSequencia,
    totais,
    carregando,
    erro,
    recarregar: carregar,
  }
}

/** Volume e frequência semanais (via RPC weekly_stats). */
export function useWeeklyStats(semanas = 12) {
  const { user } = useAuth()
  const [dados, setDados] = useState<WeeklyStatRow[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!user) {
      setCarregando(false)
      return
    }
    let ativo = true
    setCarregando(true)
    supabase
      .rpc('weekly_stats', { p_weeks: semanas })
      .then(({ data }) => {
        if (!ativo) return
        setDados(
          ((data ?? []) as WeeklyStatRow[]).map((linha) => ({
            ...linha,
            volume_kg: Number(linha.volume_kg),
            sets_count: Number(linha.sets_count),
            reps_count: Number(linha.reps_count),
            workouts_count: Number(linha.workouts_count),
          })),
        )
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [user, semanas])

  return { dados, carregando }
}

/** Recordes pessoais do usuário (view personal_records). */
export function usePersonalRecords() {
  const { user } = useAuth()
  const [recordes, setRecordes] = useState<PersonalRecord[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    if (!user) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    const { data } = await supabase
      .from('personal_records')
      .select('*')
      .order('performed_at', { ascending: false })
    setRecordes(
      ((data ?? []) as PersonalRecord[]).map((r) => ({ ...r, weight_kg: Number(r.weight_kg) })),
    )
    setCarregando(false)
  }, [user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { recordes, carregando, recarregar: carregar }
}
