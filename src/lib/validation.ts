/** Validação de formulários sem dependências externas. */

export type Erros<T> = Partial<Record<keyof T, string>>

export function validarEmail(email: string): string | undefined {
  const valor = email.trim()
  if (!valor) return 'Informe seu e-mail.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return 'E-mail inválido.'
  return undefined
}

export function validarSenha(senha: string): string | undefined {
  if (!senha) return 'Informe sua senha.'
  if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
  return undefined
}

export function validarNome(nome: string): string | undefined {
  const valor = nome.trim()
  if (!valor) return 'Informe seu nome.'
  if (valor.length < 2) return 'Nome muito curto.'
  if (valor.length > 60) return 'Nome muito longo (máximo 60 caracteres).'
  return undefined
}

export function validarTexto(
  valor: string,
  { obrigatorio = true, min = 1, max = 80, rotulo = 'Campo' } = {},
): string | undefined {
  const v = valor.trim()
  if (!v) return obrigatorio ? `${rotulo} é obrigatório.` : undefined
  if (v.length < min) return `${rotulo} deve ter pelo menos ${min} caracteres.`
  if (v.length > max) return `${rotulo} deve ter no máximo ${max} caracteres.`
  return undefined
}

export function validarNumero(
  valor: string | number | null | undefined,
  { obrigatorio = false, min = 0, max = Number.MAX_SAFE_INTEGER, rotulo = 'Valor' } = {},
): string | undefined {
  if (valor === '' || valor === null || valor === undefined) {
    return obrigatorio ? `${rotulo} é obrigatório.` : undefined
  }
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  if (!Number.isFinite(n)) return `${rotulo} deve ser um número.`
  if (n < min) return `${rotulo} deve ser no mínimo ${min}.`
  if (n > max) return `${rotulo} deve ser no máximo ${max}.`
  return undefined
}

/** Converte entrada do usuário ("82,5") em número, ou null se vazio/inválido. */
export function paraNumero(valor: string | number | null | undefined): number | null {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function temErros<T>(erros: Erros<T>): boolean {
  return Object.values(erros).some(Boolean)
}
