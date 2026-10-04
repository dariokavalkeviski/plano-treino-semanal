import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/hooks/useToast'
import { Toaster } from '@/components/layout/Toaster'
import { TelaCarregando } from '@/components/ui'
import { Logo } from '@/components/layout/AppShell'
import { isSupabaseConfigured } from '@/lib/supabase'

import { Login } from '@/pages/auth/Login'
import { Cadastro } from '@/pages/auth/Cadastro'
import { RecuperarSenha } from '@/pages/auth/RecuperarSenha'
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha'
import { Inicio } from '@/pages/Inicio'
import { Treinos } from '@/pages/Treinos'
import { RotinaEditar } from '@/pages/RotinaEditar'
import { TreinoAtivo } from '@/pages/TreinoAtivo'
import { Exercicios } from '@/pages/Exercicios'
import { Perfil } from '@/pages/Perfil'

// Telas de gráfico carregam o Recharts, que é pesado. Ficam em chunk separado
// para o caminho crítico — abrir o app e treinar — continuar leve no celular.
const Evolucao = lazy(() => import('@/pages/Evolucao').then((m) => ({ default: m.Evolucao })))
const Medidas = lazy(() => import('@/pages/Medidas').then((m) => ({ default: m.Medidas })))

/** Bloqueia rotas internas para quem não está autenticado. */
function Protegida({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  const local = useLocation()

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base-900">
        <TelaCarregando texto="Carregando seu perfil…" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  return <>{children}</>
}

/** Quem já está logado não precisa ver login/cadastro. */
function SomenteVisitante({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base-900">
        <TelaCarregando />
      </div>
    )
  }
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Sem as variáveis do Supabase o app não tem o que consultar. */
function ConfiguracaoPendente() {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-base-900 px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo tamanho="lg" />
        </div>
        <div className="card p-5">
          <h1 className="text-lg font-bold text-slate-100">Configuração necessária</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Crie um arquivo <code className="rounded bg-base-700 px-1.5 py-0.5">.env</code> na raiz
            do projeto com as credenciais do seu projeto Supabase:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-base-900 p-3 text-xs text-lime-300">
            {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
          </pre>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Os valores ficam em <strong className="text-slate-300">Project Settings → API</strong>{' '}
            no painel do Supabase. Depois rode as migrações de{' '}
            <code className="rounded bg-base-700 px-1.5 py-0.5">supabase/migrations</code> e
            reinicie o servidor de desenvolvimento.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            O passo a passo completo está no README do repositório.
          </p>
        </div>
      </div>
    </div>
  )
}

export function App() {
  if (!isSupabaseConfigured) return <ConfiguracaoPendente />

  // Em subdiretório (GitHub Pages), as rotas precisam do prefixo do base.
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ToastProvider>
          <Toaster />
          <Routes>
            {/* Públicas */}
            <Route
              path="/login"
              element={
                <SomenteVisitante>
                  <Login />
                </SomenteVisitante>
              }
            />
            <Route
              path="/cadastro"
              element={
                <SomenteVisitante>
                  <Cadastro />
                </SomenteVisitante>
              }
            />
            <Route
              path="/recuperar-senha"
              element={
                <SomenteVisitante>
                  <RecuperarSenha />
                </SomenteVisitante>
              }
            />
            {/* Chega com sessão temporária do link de e-mail, então não é "somente visitante". */}
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            {/* Protegidas */}
            <Route
              path="/"
              element={
                <Protegida>
                  <Inicio />
                </Protegida>
              }
            />
            <Route
              path="/treinos"
              element={
                <Protegida>
                  <Treinos />
                </Protegida>
              }
            />
            <Route
              path="/treinos/:id"
              element={
                <Protegida>
                  <RotinaEditar />
                </Protegida>
              }
            />
            <Route
              path="/treino-ativo"
              element={
                <Protegida>
                  <TreinoAtivo />
                </Protegida>
              }
            />
            <Route
              path="/exercicios"
              element={
                <Protegida>
                  <Exercicios />
                </Protegida>
              }
            />
            <Route
              path="/evolucao"
              element={
                <Protegida>
                  <Suspense fallback={<TelaCarregando texto="Carregando gráficos…" />}>
                    <Evolucao />
                  </Suspense>
                </Protegida>
              }
            />
            <Route
              path="/medidas"
              element={
                <Protegida>
                  <Suspense fallback={<TelaCarregando texto="Carregando gráficos…" />}>
                    <Medidas />
                  </Suspense>
                </Protegida>
              }
            />
            <Route
              path="/perfil"
              element={
                <Protegida>
                  <Perfil />
                </Protegida>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
