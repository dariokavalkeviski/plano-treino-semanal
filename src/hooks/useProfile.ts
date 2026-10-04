import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { gravar } from '@/lib/outbox'
import { gravarLocal, lerLocal } from '@/lib/storage'
import type { Profile } from '@/types/database'
import { useAuth } from './useAuth'

const CHAVE = 'profile'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(() => lerLocal<Profile | null>(CHAVE, null))
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setCarregando(false)
      return
    }
    setCarregando(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setErro(error.message)
    } else if (data) {
      setProfile(data as Profile)
      gravarLocal(CHAVE, data)
      setErro(null)
    } else {
      // O gatilho on_auth_user_created cria o perfil; se faltar (conta antiga
      // ou gatilho não aplicado), criamos aqui.
      const novo = {
        id: user.id,
        name: (user.user_metadata?.['name'] as string | undefined)?.trim() || '',
      }
      const { data: criado } = await supabase
        .from('profiles')
        .upsert(novo, { onConflict: 'id' })
        .select()
        .maybeSingle()
      if (criado) {
        setProfile(criado as Profile)
        gravarLocal(CHAVE, criado)
      }
    }
    setCarregando(false)
  }, [user])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const atualizar = useCallback(
    async (campos: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Sessão não encontrada.')
      const otimista = { ...(profile ?? ({ id: user.id } as Profile)), ...campos } as Profile
      setProfile(otimista)
      gravarLocal(CHAVE, otimista)
      return gravar({ tipo: 'update', tabela: 'profiles', id: user.id, dados: campos })
    },
    [user, profile],
  )

  return { profile, carregando, erro, atualizar, recarregar: carregar }
}
