import { useToast, type TipoToast } from '@/hooks/useToast'
import { Icone, type NomeIcone } from '@/components/ui/Icone'
import { cx } from '@/components/ui'

const ESTILOS: Record<TipoToast, { classe: string; icone: NomeIcone }> = {
  sucesso: { classe: 'border-ok/40 bg-ok/15 text-ok', icone: 'check' },
  erro: { classe: 'border-danger/40 bg-danger/15 text-danger', icone: 'alerta' },
  info: { classe: 'border-white/10 bg-base-700 text-slate-200', icone: 'info' },
  recorde: {
    classe: 'border-lime-400 bg-lime-400/20 text-lime-300 shadow-glow animate-pr-pop',
    icone: 'trofeu',
  },
}

export function Toaster() {
  const { toasts, fechar } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60]
        mx-auto flex max-w-lg flex-col gap-2 px-4"
    >
      {toasts.map((toast) => {
        const estilo = ESTILOS[toast.tipo]
        return (
          <div
            key={toast.id}
            role={toast.tipo === 'erro' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 backdrop-blur-lg',
              'animate-slide-up',
              estilo.classe,
            )}
          >
            <Icone nome={estilo.icone} tamanho={20} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{toast.titulo}</p>
              {toast.descricao && (
                <p className="mt-0.5 text-sm leading-snug opacity-80">{toast.descricao}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => fechar(toast.id)}
              aria-label="Fechar aviso"
              className="-m-1 shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
            >
              <Icone nome="fechar" tamanho={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
