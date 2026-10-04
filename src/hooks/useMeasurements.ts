import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravar } from '@/lib/outbox'
import { gravarLocal, lerLocal, novoId } from '@/lib/storage'
import type { BodyMeasurement } from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE = 'medidas'

export type CampoMedida = 'weight_kg' | 'chest_cm' | 'waist_cm' | 'arm_cm' | 'thigh_cm'

export const CAMPOS_MEDIDA: { campo: CampoMedida; rotulo: string; unidade: string }[] = [
  { campo: 'weight_kg', rotulo: 'Peso', unidade: 'kg' },
  { campo: 'chest_cm', rotulo: 'Peito', unidade: 'cm' },
  { campo: 'waist_cm', rotulo: 'Cintura', unidade: 'cm' },
  { campo: 'arm_cm', rotulo: 'Braço', unidade: 'cm' },
  { campo: 'thigh_cm', rotulo: 'Coxa', unidade: 'cm' },
]

export type EntradaMedida = Pick<
  BodyMeasurement,
  'measured_on' | 'weight_kg' | 'chest_cm' | 'waist_cm' | 'arm_cm' | 'thigh_cm' | 'notes'
>

export function useMeasurements() {
  const { user } = useAuth()
  const [medidas, setMedidas] = useState<BodyMeasurement[]>(() =>
    lerLocal<BodyMeasurement[]>(CHAVE, []),
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
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_on', { ascending: false })

    if (error) {
      setErro(error.message)
    } else {
      const lista = (data ?? []) as BodyMeasurement[]
      setMedidas(lista)
      gravarLocal(CHAVE, lista)
      setErro(null)
    }
    setCarregando(false)
  }, [user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const salvarCache = useCallback((lista: BodyMeasurement[]) => {
    const ordenada = [...lista].sort((a, b) => b.measured_on.localeCompare(a.measured_on))
    setMedidas(ordenada)
    gravarLocal(CHAVE, ordenada)
  }, [])

  /** Uma medição por dia: registrar de novo no mesmo dia substitui a anterior. */
  const registrar = useCallback(
    async (entrada: EntradaMedida) => {
      if (!user) throw new Error('Sessão não encontrada.')
      const existente = medidas.find((m) => m.measured_on === entrada.measured_on)
      const registro: BodyMeasurement = {
        id: existente?.id ?? novoId(),
        user_id: user.id,
        created_at: existente?.created_at ?? new Date().toISOString(),
        ...entrada,
      }
      salvarCache([...medidas.filter((m) => m.id !== registro.id), registro])
      await gravar({
        tipo: 'upsert',
        tabela: 'body_measurements',
        dados: registro,
        onConflict: 'user_id,measured_on',
      })
      return registro
    },
    [user, medidas, salvarCache],
  )

  const excluir = useCallback(
    async (id: string) => {
      salvarCache(medidas.filter((m) => m.id !== id))
      await gravar({ tipo: 'delete', tabela: 'body_measurements', id })
    },
    [medidas, salvarCache],
  )

  const ultima = useMemo(() => medidas[0] ?? null, [medidas])

  /** Variação entre a medição mais recente e a anterior, por campo. */
  const variacoes = useMemo(() => {
    const resultado: Partial<Record<CampoMedida, number>> = {}
    for (const { campo } of CAMPOS_MEDIDA) {
      const comValor = medidas.filter((m) => m[campo] !== null)
      const atual = comValor[0]?.[campo]
      const anterior = comValor[1]?.[campo]
      if (typeof atual === 'number' && typeof anterior === 'number') {
        resultado[campo] = atual - anterior
      }
    }
    return resultado
  }, [medidas])

  /** Série temporal em ordem crescente para os gráficos. */
  const serie = useMemo(
    () => [...medidas].sort((a, b) => a.measured_on.localeCompare(b.measured_on)),
    [medidas],
  )

  return {
    medidas,
    serie,
    ultima,
    variacoes,
    carregando,
    erro,
    registrar,
    excluir,
    recarregar: carregar,
  }
}
