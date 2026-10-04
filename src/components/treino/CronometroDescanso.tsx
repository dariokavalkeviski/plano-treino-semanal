import { formatarCronometro } from '@/lib/format'
import { Icone } from '@/components/ui/Icone'

interface Props {
  restante: number
  total: number
  onAjustar: (delta: number) => void
  onCancelar: () => void
}

/**
 * Painel fixo de descanso. Fica acima da navegação, com o tempo bem grande
 * para ser lido de longe, e botões largos para ajustar sem precisar de precisão.
 */
export function CronometroDescanso({ restante, total, onAjustar, onCancelar }: Props) {
  const percentual = total > 0 ? ((total - restante) / total) * 100 : 0
  const quaseFim = restante <= 5

  return (
    <div
      role="timer"
      aria-live="off"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-lime-400/30
        bg-base-800/98 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className="h-1 bg-lime-400 transition-[width] duration-200 ease-linear"
        style={{ width: `${100 - percentual}%` }}
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Descanso
          </p>
          <p
            className={`text-3xl font-extrabold leading-none tabular-nums ${
              quaseFim ? 'text-lime-400' : 'text-slate-100'
            }`}
          >
            {formatarCronometro(restante)}
          </p>
          <p className="sr-only" aria-live="polite">
            {restante <= 3 ? `${restante} segundos para a próxima série` : ''}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAjustar(-15)}
            aria-label="Reduzir 15 segundos do descanso"
            className="flex h-12 min-w-[56px] items-center justify-center rounded-xl border
              border-white/10 bg-base-700 text-sm font-bold text-slate-200 active:scale-95"
          >
            −15s
          </button>
          <button
            type="button"
            onClick={() => onAjustar(15)}
            aria-label="Adicionar 15 segundos ao descanso"
            className="flex h-12 min-w-[56px] items-center justify-center rounded-xl border
              border-white/10 bg-base-700 text-sm font-bold text-slate-200 active:scale-95"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Pular descanso"
            className="flex h-12 items-center gap-1.5 rounded-xl bg-lime-400 px-4 text-sm
              font-bold text-base-900 active:scale-95"
          >
            <Icone nome="play" tamanho={16} />
            Pular
          </button>
        </div>
      </div>
    </div>
  )
}
