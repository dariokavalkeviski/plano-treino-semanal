import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface ContextoAuth {
  session: Session | null
  user: User | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<{ precisaConfirmar: boolean }>
  sair: () => Promise<void>
  recuperarSenha: (email: string) => Promise<void>
  definirNovaSenha: (senha: string) => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!ativo) return
        setSession(data.session)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao)
      setCarregando(false)
    })

    return () => {
      ativo = false
      inscricao.subscription.unsubscribe()
    }
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })
    if (error) throw error
  }, [])

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: { data: { name: nome.trim() } },
    })
    if (error) throw error
    // Sem sessão após o signUp => o projeto exige confirmação por e-mail.
    return { precisaConfirmar: !data.session }
  }, [])

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw error
  }, [])

  const definirNovaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) throw error
  }, [])

  const valor = useMemo<ContextoAuth>(
    () => ({
      session,
      user: session?.user ?? null,
      carregando,
      entrar,
      cadastrar,
      sair,
      recuperarSenha,
      definirNovaSenha,
    }),
    [session, carregando, entrar, cadastrar, sair, recuperarSenha, definirNovaSenha],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return contexto
}
