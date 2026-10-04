# 💪 FitTrack

**App publicado:** <https://dariokavalkeviski.github.io/plano-treino-semanal/>

Aplicativo web **mobile-first** para registrar e acompanhar treinos de academia: monte suas
rotinas, registre cada série executada e acompanhe a evolução de carga e volume ao longo do tempo.

Funciona como **PWA** (instalável no celular) e **continua funcionando offline durante o treino** —
as séries são salvas no aparelho e sincronizadas quando a conexão volta.

> Este repositório era um plano de treino estático em HTML/CSS/JS. Foi reescrito como aplicação
> React + Supabase. A versão anterior continua acessível no histórico do Git (commit `f35c6c9`).

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Interface | React 18 + TypeScript + Tailwind CSS |
| Build | Vite 5 + `vite-plugin-pwa` (Workbox) |
| Backend | Supabase — Auth (e-mail/senha), PostgreSQL e Row Level Security |
| Gráficos | Recharts |

---

## Funcionalidades

**Autenticação e perfil**
- Cadastro, login, recuperação e redefinição de senha
- Perfil com nome, peso, altura e objetivo (hipertrofia, força, emagrecimento, condicionamento)
- Cálculo de IMC a partir do peso e altura do perfil

**Biblioteca de exercícios**
- 78 exercícios pré-carregados, cobrindo os 8 grupos musculares
- Cada exercício tem grupo muscular, equipamento e instruções curtas de execução
- Busca sem acento e filtros por grupo muscular e equipamento
- Criação, edição e exclusão de exercícios personalizados

**Rotinas de treino**
- Criar, renomear, duplicar e excluir rotinas (Treino A/B/C, Push/Pull/Legs, o que for)
- Exercícios ordenados, com arrastar para reordenar (e setas ↑/↓ como alternativa acessível)
- Séries, faixa de repetições alvo, tempo de descanso e observações por exercício

**Execução do treino**
- Tela de treino ativo com marcação de série por série, informando carga e repetições
- Carga e repetições da última vez aparecem como referência e já vêm pré-preenchidas
- Cronômetro de descanso automático, com aviso sonoro e vibração
- Duração total da sessão e resumo ao finalizar (volume, séries, recordes)
- Séries extras, desfazer série, descartar treino

**Histórico e evolução**
- Calendário mensal com os dias treinados
- Sequência atual e melhor sequência de dias
- Gráficos de evolução de carga por exercício, volume semanal e frequência semanal
- Recordes pessoais (PR) detectados automaticamente, com feedback visual, sonoro e vibração

**Medidas corporais**
- Registro de peso, peito, cintura, braço e coxa
- Variação em relação à medição anterior e gráfico de evolução por medida

---

## Como rodar

### 1. Pré-requisitos

- Node.js 18 ou superior
- Uma conta no [Supabase](https://supabase.com) (o plano gratuito atende)

### 2. Instalar

```bash
git clone https://github.com/dariokavalkeviski/plano-treino-semanal.git
cd plano-treino-semanal
npm install
```

### 3. Criar o projeto no Supabase

1. Em [app.supabase.com](https://app.supabase.com), crie um novo projeto (região `sa-east-1`
   para menor latência no Brasil).
2. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

### 4. Aplicar as migrações

As migrações estão em [`supabase/migrations/`](supabase/migrations/) e precisam ser aplicadas
**na ordem**:

| Arquivo | O que faz |
| --- | --- |
| `20260101000000_fittrack_schema.sql` | Tabelas, índices, RLS, views e funções |
| `20260101000100_seed_exercises.sql` | Carrega os 78 exercícios da biblioteca |

**Opção A — pelo painel (mais simples)**

Abra o **SQL Editor** do projeto, cole o conteúdo de cada arquivo e execute, um de cada vez.

**Opção B — pela CLI do Supabase**

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Ambas as migrações são idempotentes: podem ser reexecutadas sem duplicar dados.

### 5. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Preencha com os valores copiados no passo 3:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> A chave `anon` é pública por natureza — a proteção dos dados vem do Row Level Security,
> não do segredo da chave. **Nunca** coloque a `service_role` key aqui.

### 6. Rodar

```bash
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm run build    # build de produção (checa tipos antes)
npm run preview  # testa o build localmente (o PWA só funciona no build)
```

---

## Configuração de autenticação no Supabase

Em **Authentication → URL Configuration**, defina:

- **Site URL**: a URL onde o app está publicado (em desenvolvimento, `http://localhost:5173`)
- **Redirect URLs**: adicione `http://localhost:5173/redefinir-senha` e a URL equivalente de
  produção — é para lá que o link de recuperação de senha aponta.

Em **Authentication → Providers → Email**, você pode desligar *Confirm email* durante o
desenvolvimento para entrar direto após o cadastro.

---

## Modelo de dados

```
auth.users
    └── profiles            (1:1, criado por gatilho no cadastro)

exercises                   (user_id NULL = biblioteca global, somente leitura)
    ↑
routine_exercises ──→ routines ──→ auth.users
    
workouts ──→ auth.users
    └── workout_sets ──→ exercises

body_measurements ──→ auth.users
```

**Row Level Security está ativo em todas as tabelas.** Cada usuário só enxerga e altera os
próprios registros; a única exceção é a leitura da biblioteca global de exercícios, aberta para
qualquer usuário autenticado e fechada para escrita.

Além das tabelas, o banco expõe:

- `personal_records` — view com a maior carga registrada por exercício
- `last_sets_for_exercises(uuid[])` — séries do último treino de cada exercício (referência de carga)
- `weekly_stats(int)` — volume, séries, repetições e número de treinos por semana
- `exercise_progress(uuid)` — melhor carga e volume por sessão de um exercício

As views e funções usam `security_invoker` / `security invoker`, ou seja, respeitam o RLS de quem
consulta.

---

## Como o modo offline funciona

A tela de treino não pode depender da internet — a conexão na academia costuma ser ruim.

1. Toda escrita passa por uma **fila (outbox)** em `src/lib/outbox.ts`.
2. Se a gravação falhar por rede, a operação fica na fila e a interface segue com o estado otimista.
3. Os ids são **UUIDs gerados no aparelho**, então os registros sincronizam depois sem conflito.
4. Quando a conexão volta, a fila é reenviada **na ordem original**.
5. A sessão de treino em andamento é persistida inteira no `localStorage`: dá para fechar o app,
   ficar sem internet e continuar de onde parou.

A faixa no topo mostra o estado (offline, sincronizando, pendências) e o Perfil permite forçar o
envio.

---

## Publicação

### GitHub Pages (configuração atual)

O app é publicado em <https://dariokavalkeviski.github.io/plano-treino-semanal/> pelo workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que roda a cada push no `main`.

Em **Settings → Pages**, a origem precisa estar como **GitHub Actions** (não "Deploy from a
branch") — o Pages precisa publicar o `dist/` gerado pelo build, não o `index.html` do código-fonte.

Três detalhes fazem o Pages funcionar com uma SPA em subdiretório:

- `base` do Vite é `/plano-treino-semanal/`, e o `BrowserRouter` usa o mesmo prefixo
- o build copia `index.html` para `404.html`, que é como o Pages atende rotas como `/treinos`
- `.nojekyll` impede o Pages de ignorar arquivos iniciados por `_`

**Para o app sair da tela de "configuração necessária"**, cadastre os secrets em
**Settings → Secrets and variables → Actions**:

| Secret | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon public key do Supabase |

Depois rode o workflow de novo (**Actions → Publicar no GitHub Pages → Run workflow**). As
variáveis são lidas **no build**, então mudá-las exige um novo deploy.

### Vercel ou Netlify

Também já estão prontos `vercel.json` e `public/_redirects` com os rewrites de SPA. Como essas
hospedagens servem na raiz, defina `VITE_BASE=/` junto das variáveis do Supabase.

---

## Estrutura

```
src/
├── components/
│   ├── ui/            Botões, campos, modal, estados vazios, lista ordenável
│   ├── layout/        AppShell, navegação inferior, barra de status, toasts
│   ├── exercicios/    Formulário de exercício personalizado
│   ├── rotinas/       Seletor de exercícios e editor de séries/descanso
│   ├── treino/        Linha de série, cronômetro de descanso, resumo final
│   ├── evolucao/      Calendário de dias treinados
│   └── graficos/      Gráficos em Recharts (chunk carregado sob demanda)
├── hooks/             Auth, perfil, exercícios, rotinas, treino ativo, histórico…
├── lib/               Supabase, outbox offline, formatação, validação, feedback
├── pages/             Telas, incluindo as de autenticação em pages/auth/
└── types/             Tipos espelhando o esquema do banco
```

---

## Acessibilidade

- Alvos de toque de no mínimo 44–48px, pensados para uso com uma mão durante o treino
- Rótulos (`aria-label`) em todos os controles só com ícone
- Erros de formulário ligados aos campos por `aria-describedby` e anunciados com `role="alert"`
- Foco visível em todos os elementos operáveis
- Reordenação de exercícios disponível por botões, não só por arraste
- `prefers-reduced-motion` respeitado

---

## Licença

Projeto pessoal de estudo, livre para uso e modificação.
