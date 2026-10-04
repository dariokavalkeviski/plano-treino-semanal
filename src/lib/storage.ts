/** Acesso tipado e tolerante a falhas ao localStorage. */

const PREFIXO = 'fittrack:'

export function lerLocal<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave)
    if (bruto === null) return padrao
    return JSON.parse(bruto) as T
  } catch {
    return padrao
  }
}

export function gravarLocal<T>(chave: string, valor: T): void {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor))
  } catch {
    // Modo privado ou cota cheia: o app continua funcionando sem persistência.
  }
}

export function removerLocal(chave: string): void {
  try {
    localStorage.removeItem(PREFIXO + chave)
  } catch {
    /* ignora */
  }
}

/** UUID v4 com fallback para navegadores sem crypto.randomUUID. */
export function novoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
