import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravar } from '@/lib/outbox'
import { gravarLocal, lerLocal, novoId } from '@/lib/storage'
import type { Exercise, MuscleGroup } from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE = 'exercises'

export interface NovoExercicio {
  name: string
  muscle_group: MuscleGroup
  equipment: string
  instructions: string | null
}

/**
 * Biblioteca de exercícios: globais (user_id null) + personalizados do usuário.
 * Fica em cache local para a tela abrir offline.
 */
export function useExercises() {
  const { user } = useAuth()
  const [exercicios, setExercicios] = useState<Exercise[]>(() => lerLocal<Exercise[]>(CHAVE, []))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setErro(error.message)
    } else {
      const lista = (data ?? []) as Exercise[]
      setExercicios(lista)
      gravarLocal(CHAVE, lista)
      setErro(null)
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const criar = useCallback(
    async (dados: NovoExercicio) => {
      if (!user) throw new Error('Sessão não encontrada.')
      const registro: Exercise = {
        id: novoId(),
        user_id: user.id,
        name: dados.name.trim(),
        muscle_group: dados.muscle_group,
        equipment: dados.equipment.trim() || 'peso do corpo',
        instructions: dados.instructions?.trim() || null,
        created_at: new Date().toISOString(),
      }
      setExercicios((atual) => {
        const lista = [...atual, registro].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        gravarLocal(CHAVE, lista)
        return lista
      })
      await gravar({ tipo: 'insert', tabela: 'exercises', dados: registro })
      return registro
    },
    [user],
  )

  const atualizar = useCallback(async (id: string, dados: Partial<NovoExercicio>) => {
    setExercicios((atual) => {
      const lista = atual
        .map((e) => (e.id === id ? { ...e, ...dados } : e))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      gravarLocal(CHAVE, lista)
      return lista
    })
    await gravar({ tipo: 'update', tabela: 'exercises', id, dados })
  }, [])

  const excluir = useCallback(async (id: string) => {
    setExercicios((atual) => {
      const lista = atual.filter((e) => e.id !== id)
      gravarLocal(CHAVE, lista)
      return lista
    })
    await gravar({ tipo: 'delete', tabela: 'exercises', id })
  }, [])

  const porId = useMemo(() => {
    const mapa = new Map<string, Exercise>()
    for (const e of exercicios) mapa.set(e.id, e)
    return mapa
  }, [exercicios])

  const equipamentos = useMemo(() => {
    const unicos = new Set(exercicios.map((e) => e.equipment).filter(Boolean))
    return [...unicos].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [exercicios])

  return {
    exercicios,
    porId,
    equipamentos,
    carregando,
    erro,
    criar,
    atualizar,
    excluir,
    recarregar: carregar,
  }
}

/** Busca e filtros aplicados em memória — a biblioteca cabe toda no cliente. */
export function filtrarExercicios(
  lista: Exercise[],
  { busca = '', grupo = null as MuscleGroup | null, equipamento = null as string | null,
    somenteMeus = false },
): Exercise[] {
  const termo = busca
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  return lista.filter((e) => {
    if (grupo && e.muscle_group !== grupo) return false
    if (equipamento && e.equipment !== equipamento) return false
    if (somenteMeus && !e.user_id) return false
    if (!termo) return true
    const alvo = `${e.name} ${e.equipment}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    return alvo.includes(termo)
  })
}
