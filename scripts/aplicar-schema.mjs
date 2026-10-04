#!/usr/bin/env node
/**
 * Aplica o schema do FitTrack no banco do Supabase.
 *
 *   npm run db:aplicar
 *
 * A senha do banco NAO e a mesma da sua conta Supabase. Pegue a string de
 * conexao em: Project Settings > Database > Connection string > URI
 * (use a opcao "Session pooler", porta 5432 — a "Transaction pooler", 6543,
 * nao aceita os blocos DO $$ ... $$ desta migracao).
 *
 * Passe a string por variavel de ambiente ou argumento:
 *   DATABASE_URL="postgresql://..." npm run db:aplicar
 *   npm run db:aplicar -- "postgresql://..."
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const ARQUIVOS = [
  'supabase/migrations/20260101000000_fittrack_schema.sql',
  'supabase/migrations/20260101000100_seed_exercises.sql',
]

function abortar(mensagem) {
  console.error(`\n  ${mensagem}\n`)
  process.exit(1)
}

const conexao = process.argv[2] || process.env.DATABASE_URL
if (!conexao) {
  abortar(
    [
      'Informe a string de conexao do banco.',
      '',
      '  Onde achar: painel do Supabase > Project Settings > Database',
      '              > Connection string > URI > aba "Session pooler"',
      '',
      '  Depois rode:',
      '    npm run db:aplicar -- "postgresql://postgres.SEU_REF:SENHA@...pooler.supabase.com:5432/postgres"',
      '',
      '  (A senha do banco e diferente da senha da sua conta Supabase.',
      '   Se nao lembrar, da para redefinir na mesma tela.)',
    ].join('\n'),
  )
}

if (conexao.includes(':6543')) {
  abortar(
    'Essa e a string do "Transaction pooler" (porta 6543), que nao executa\n' +
      '  blocos DO $$ ... $$. Use a do "Session pooler" (porta 5432).',
  )
}

let pg
try {
  pg = await import('pg')
} catch {
  abortar('Dependencia faltando. Rode primeiro:  npm install')
}

const { Client } = pg.default ?? pg

// O certificado do pooler do Supabase nao encadeia numa CA publica, entao a
// verificacao e desligada. A conexao continua criptografada.
const cliente = new Client({
  connectionString: conexao,
  ssl: { rejectUnauthorized: false },
  // Migracao grande: nao deixa o pooler derrubar no meio.
  statement_timeout: 120_000,
})

try {
  process.stdout.write('conectando... ')
  await cliente.connect()
  console.log('ok')

  for (const arquivo of ARQUIVOS) {
    const sql = readFileSync(join(RAIZ, arquivo), 'utf8')
    process.stdout.write(`aplicando ${arquivo.split('/').pop()}... `)
    // O arquivo inteiro vai numa query so: separar por ";" quebraria os
    // blocos DO $$ ... $$ e as funcoes. O Postgres roda tudo numa transacao
    // implicita, entao ou aplica inteiro ou nao aplica nada.
    await cliente.query(sql)
    console.log('ok')
  }

  const { rows } = await cliente.query(`
    select
      (select count(*) from public.exercises where user_id is null) as exercicios,
      (select count(*) from pg_tables where schemaname = 'public') as tabelas,
      (select count(*) from pg_tables
        where schemaname = 'public' and rowsecurity) as com_rls
  `)

  const r = rows[0]
  console.log('')
  console.log('  tabelas criadas .......... ' + r.tabelas)
  console.log('  com RLS ativo ............ ' + r.com_rls)
  console.log('  exercicios na biblioteca . ' + r.exercicios)
  console.log('')

  if (Number(r.com_rls) < Number(r.tabelas)) {
    console.log('  ATENCAO: alguma tabela ficou sem RLS. Verifique antes de usar.')
  } else {
    console.log('  Pronto. Todas as tabelas estao protegidas por RLS.')
  }
} catch (erro) {
  console.log('falhou')

  const msg = erro.message ?? String(erro)
  const dicas = []

  if (/tenant.*not found|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    dicas.push(
      'O host do pooler muda conforme a regiao do projeto. Nao monte a string',
      'na mao: copie exatamente a que aparece no painel, em Project Settings >',
      'Database > Connection string > URI > "Session pooler".',
    )
  } else if (/password authentication failed|SASL|SCRAM/i.test(msg)) {
    dicas.push(
      'Senha do banco incorreta. Ela nao e a senha da sua conta Supabase —',
      'e a senha do Postgres, que da para redefinir em Project Settings >',
      'Database > Database password.',
      '',
      'Se a senha tiver caracteres como @ : / ou #, ela precisa estar',
      'codificada na URL (@ vira %40, por exemplo).',
    )
  } else if (/already exists/i.test(msg)) {
    dicas.push(
      'Algo ja existia com outra definicao. Se voce aplicou o schema antes,',
      'nada precisa ser feito — as migracoes sao idempotentes.',
    )
  } else {
    dicas.push(
      'Nada foi aplicado: o Postgres roda o arquivo em uma transacao,',
      'entao o banco continua no estado anterior.',
    )
  }

  abortar([`Erro: ${msg}`, '', ...dicas].join('\n  '))
} finally {
  await cliente.end().catch(() => {})
}
