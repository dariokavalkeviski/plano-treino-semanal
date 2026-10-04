import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { BarraStatus } from './BarraStatus'
import { BotaoIcone, cx } from '@/components/ui'

interface AppShellProps {
  titulo?: string
  subtitulo?: string
  acao?: ReactNode
  /** Mostra seta de voltar em vez do logo. */
  comVoltar?: boolean
  /** Telas de treino ativo escondem a navegação inferior. */
  semNavegacao?: boolean
  children: ReactNode
}

export function AppShell({
  titulo,
  subtitulo,
  acao,
  comVoltar,
  semNavegacao,
  children,
}: AppShellProps) {
  const navegar = useNavigate()

  return (
    <div className="min-h-dvh bg-base-900">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-base-900/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          {comVoltar ? (
            <BotaoIcone
              nome="seta_esq"
              rotulo="Voltar"
              onClick={() => navegar(-1)}
              className="-ml-2"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            {titulo ? (
              <>
                <h1 className="truncate text-xl font-bold text-slate-100">{titulo}</h1>
                {subtitulo && <p className="truncate text-sm text-slate-400">{subtitulo}</p>}
              </>
            ) : (
              <Link to="/" className="inline-flex items-center gap-2" aria-label="FitTrack, início">
                <Logo />
              </Link>
            )}
          </div>

          {acao}
        </div>
        <BarraStatus />
      </header>

      <main className={cx('mx-auto max-w-lg px-4 pt-4', semNavegacao ? 'pb-8' : 'pb-28')}>
        {children}
      </main>

      {!semNavegacao && <BottomNav />}
    </div>
  )
}

export function Logo({ tamanho = 'md' }: { tamanho?: 'md' | 'lg' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={tamanho === 'lg' ? 36 : 28}
        height={tamanho === 'lg' ? 36 : 28}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="text-lime-400"
      >
        <rect x="1" y="1" width="22" height="22" rx="7" fill="currentColor" opacity="0.14" />
        <path
          d="M6.5 7v10M4 9.5v5M17.5 7v10M20 9.5v5M6.5 12h11"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className={cx(
          'font-extrabold tracking-tight text-slate-100',
          tamanho === 'lg' ? 'text-3xl' : 'text-xl',
        )}
      >
        Fit<span className="text-lime-400">Track</span>
      </span>
    </span>
  )
}
