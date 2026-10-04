import type { ReactNode } from 'react'
import { Logo } from '@/components/layout/AppShell'

export function AuthLayout({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string
  descricao: string
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-base-900 px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo tamanho="lg" />
          <h1 className="mt-6 text-2xl font-bold text-slate-100">{titulo}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{descricao}</p>
        </div>

        <div className="card p-5">{children}</div>

        {rodape && <div className="mt-6 text-center text-sm text-slate-400">{rodape}</div>}
      </div>
    </div>
  )
}
