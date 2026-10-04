import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Quando as variáveis não estão configuradas, o app mostra uma tela de
 * instruções em vez de quebrar com erro de runtime.
 */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('SEU-PROJETO') && !anonKey.startsWith('sua-chave'),
)

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'chave-nao-configurada',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'fittrack-auth',
    },
  },
)

/** Mensagens de erro do Supabase traduzidas para português. */
export function traduzirErro(error: unknown): string {
  const msg =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Erro inesperado.'

  const mapa: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
    [/user already registered/i, 'Já existe uma conta com este e-mail.'],
    [/password should be at least/i, 'A senha deve ter pelo menos 6 caracteres.'],
    [/unable to validate email/i, 'E-mail inválido.'],
    [/for security purposes|rate limit|too many requests/i,
      'Muitas tentativas. Aguarde alguns instantes e tente novamente.'],
    [/duplicate key|already exists/i, 'Esse registro já existe.'],
    [/failed to fetch|network|offline/i,
      'Sem conexão com o servidor. Suas alterações ficam salvas no aparelho.'],
    [/jwt expired|invalid token/i, 'Sua sessão expirou. Entre novamente.'],
    [/row-level security/i, 'Você não tem permissão para esta ação.'],
    [/new row violates check constraint/i, 'Valor fora do intervalo permitido.'],
  ]

  for (const [padrao, texto] of mapa) {
    if (padrao.test(msg)) return texto
  }
  return msg
}
