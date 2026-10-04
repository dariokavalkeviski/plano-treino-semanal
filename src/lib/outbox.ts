/**
 * Fila de escritas pendentes (outbox).
 *
 * O treino precisa funcionar sem internet: toda gravação passa por aqui.
 * Se o envio ao Supabase falhar por rede, a operação fica na fila e é
 * reenviada na ordem original quando a conexão volta. Os ids são gerados no
 * aparelho (UUID), então os registros sincronizam sem conflito de chave.
 */
import { supabase } from './supabase'
import { gravarLocal, lerLocal, novoId } from './storage'

export type Tabela =
  | 'profiles'
  | 'exercises'
  | 'routines'
  | 'routine_exercises'
  | 'workouts'
  | 'workout_sets'
  | 'body_measurements'

/** Qualquer objeto serializável em JSON; o Supabase valida as colunas. */
type Linha = object

export type Operacao =
  | { tipo: 'insert'; tabela: Tabela; dados: Linha }
  | { tipo: 'upsert'; tabela: Tabela; dados: Linha; onConflict?: string }
  | { tipo: 'update'; tabela: Tabela; dados: Linha; id: string }
  | { tipo: 'delete'; tabela: Tabela; id: string }

export interface ItemFila {
  id: string
  criadoEm: number
  operacao: Operacao
}

const CHAVE = 'outbox'
const ouvintes = new Set<(pendentes: number) => void>()

function lerFila(): ItemFila[] {
  return lerLocal<ItemFila[]>(CHAVE, [])
}

function gravarFila(itens: ItemFila[]): void {
  gravarLocal(CHAVE, itens)
  for (const ouvinte of ouvintes) ouvinte(itens.length)
}

export function pendentes(): number {
  return lerFila().length
}

export function observarFila(ouvinte: (pendentes: number) => void): () => void {
  ouvintes.add(ouvinte)
  ouvinte(pendentes())
  return () => ouvintes.delete(ouvinte)
}

function ehErroDeRede(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro)
  return /failed to fetch|networkerror|network request failed|load failed|timeout/i.test(msg)
}

async function executar(op: Operacao): Promise<void> {
  if (op.tipo === 'insert') {
    const { error } = await supabase.from(op.tabela).insert(op.dados)
    if (error) throw new Error(error.message)
    return
  }
  if (op.tipo === 'upsert') {
    const { error } = await supabase
      .from(op.tabela)
      .upsert(op.dados, op.onConflict ? { onConflict: op.onConflict } : undefined)
    if (error) throw new Error(error.message)
    return
  }
  if (op.tipo === 'update') {
    const { error } = await supabase.from(op.tabela).update(op.dados).eq('id', op.id)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from(op.tabela).delete().eq('id', op.id)
  if (error) throw new Error(error.message)
}

function enfileirar(op: Operacao): void {
  gravarFila([...lerFila(), { id: novoId(), criadoEm: Date.now(), operacao: op }])
}

/**
 * Tenta gravar agora. Em falha de rede, enfileira e resolve como "pendente"
 * para a interface seguir com o estado otimista. Outros erros (RLS, validação)
 * são propagados, porque reenviar não resolveria.
 */
export async function gravar(op: Operacao): Promise<'enviado' | 'pendente'> {
  if (!navigator.onLine) {
    enfileirar(op)
    return 'pendente'
  }
  try {
    await executar(op)
    return 'enviado'
  } catch (erro) {
    if (ehErroDeRede(erro)) {
      enfileirar(op)
      return 'pendente'
    }
    throw erro
  }
}

let sincronizando = false

/** Reenvia a fila em ordem. Para no primeiro erro de rede e mantém o resto. */
export async function sincronizar(): Promise<{ enviados: number; restantes: number }> {
  if (sincronizando || !navigator.onLine) {
    return { enviados: 0, restantes: pendentes() }
  }
  sincronizando = true
  let enviados = 0
  try {
    let fila = lerFila()
    while (fila.length > 0) {
      const item = fila[0]
      if (!item) break
      try {
        await executar(item.operacao)
        enviados++
      } catch (erro) {
        if (ehErroDeRede(erro)) break
        // Erro permanente (ex.: registro já apagado no servidor): descarta o
        // item para a fila não travar para sempre.
        console.warn('[outbox] operação descartada após erro permanente:', erro)
      }
      fila = fila.slice(1)
      gravarFila(fila)
    }
    return { enviados, restantes: pendentes() }
  } finally {
    sincronizando = false
  }
}

export function limparFila(): void {
  gravarFila([])
}
