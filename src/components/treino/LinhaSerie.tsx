import { Icone } from '@/components/ui/Icone'
import { cx } from '@/components/ui'
import { formatarPeso } from '@/lib/format'
import type { SerieAtiva } from '@/hooks/useActiveWorkout'

interface Props {
  serie: SerieAtiva
  onMudarPeso: (peso: number) => void
  onMudarReps: (reps: number) => void
  onConcluir: () => void
  onDesfazer: () => void
  onRemover: () => void
  podeRemover: boolean
}

const PASSO_PESO = 2.5

/**
 * Uma série na tela de treino: carga, repetições e o botão de concluir.
 *
 * Tudo aqui é dimensionado para o uso com uma mão, durante o treino: campos
 * grandes, botões de 48px e a referência da última vez sempre visível.
 */
export function LinhaSerie({
  serie,
  onMudarPeso,
  onMudarReps,
  onConcluir,
  onDesfazer,
  onRemover,
  podeRemover,
}: Props) {
  const concluida = serie.concluida
  const podeConcluir = serie.reps > 0

  return (
    <div
      className={cx(
        'rounded-xl border p-2.5 transition-colors',
        concluida
          ? serie.recorde
            ? 'border-lime-400 bg-lime-400/15'
            : 'border-ok/30 bg-ok/10'
          : 'border-white/5 bg-base-700',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Número da série */}
        <span
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
            concluida ? 'bg-ok/20 text-ok' : 'bg-base-600 text-slate-400',
          )}
          aria-hidden="true"
        >
          {serie.numero}
        </span>

        {/* Carga */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => onMudarPeso(Math.max(0, serie.peso - PASSO_PESO))}
            disabled={concluida || serie.peso <= 0}
            aria-label={`Diminuir carga da série ${serie.numero}`}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg
              text-slate-300 active:scale-95 disabled:opacity-25"
          >
            <Icone nome="menos" tamanho={16} />
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Carga da série {serie.numero} em quilos</span>
            <input
              type="number"
              inputMode="decimal"
              step={PASSO_PESO}
              min={0}
              max={1000}
              value={serie.peso === 0 ? '' : serie.peso}
              placeholder="0"
              disabled={concluida}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'))
                onMudarPeso(Number.isFinite(n) ? Math.min(1000, Math.max(0, n)) : 0)
              }}
              className="h-11 w-full rounded-lg border border-white/10 bg-base-600 px-1
                text-center text-base font-bold tabular-nums text-slate-100
                disabled:border-transparent disabled:bg-transparent disabled:opacity-80"
            />
          </label>
          <button
            type="button"
            onClick={() => onMudarPeso(serie.peso + PASSO_PESO)}
            disabled={concluida}
            aria-label={`Aumentar carga da série ${serie.numero}`}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg
              text-slate-300 active:scale-95 disabled:opacity-25"
          >
            <Icone nome="mais" tamanho={16} />
          </button>
        </div>

        <span className="shrink-0 text-xs font-semibold text-slate-500" aria-hidden="true">
          kg
        </span>

        {/* Repetições */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMudarReps(Math.max(0, serie.reps - 1))}
            disabled={concluida || serie.reps <= 0}
            aria-label={`Diminuir repetições da série ${serie.numero}`}
            className="flex h-11 w-8 items-center justify-center rounded-lg text-slate-300
              active:scale-95 disabled:opacity-25"
          >
            <Icone nome="menos" tamanho={16} />
          </button>
          <label>
            <span className="sr-only">Repetições da série {serie.numero}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              value={serie.reps === 0 ? '' : serie.reps}
              placeholder="0"
              disabled={concluida}
              onChange={(e) => {
                const n = Number(e.target.value)
                onMudarReps(Number.isFinite(n) ? Math.min(500, Math.max(0, Math.trunc(n))) : 0)
              }}
              className="h-11 w-12 rounded-lg border border-white/10 bg-base-600 px-1
                text-center text-base font-bold tabular-nums text-slate-100
                disabled:border-transparent disabled:bg-transparent disabled:opacity-80"
            />
          </label>
          <button
            type="button"
            onClick={() => onMudarReps(serie.reps + 1)}
            disabled={concluida}
            aria-label={`Aumentar repetições da série ${serie.numero}`}
            className="flex h-11 w-8 items-center justify-center rounded-lg text-slate-300
              active:scale-95 disabled:opacity-25"
          >
            <Icone nome="mais" tamanho={16} />
          </button>
        </div>

        {/* Concluir / desfazer */}
        <button
          type="button"
          onClick={concluida ? onDesfazer : onConcluir}
          disabled={!concluida && !podeConcluir}
          aria-label={
            concluida
              ? `Desfazer série ${serie.numero}`
              : `Concluir série ${serie.numero}: ${formatarPeso(serie.peso)} por ${serie.reps} repetições`
          }
          aria-pressed={concluida}
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95',
            concluida
              ? 'bg-ok text-base-900'
              : podeConcluir
                ? 'bg-lime-400 text-base-900'
                : 'bg-base-600 text-slate-500',
          )}
        >
          <Icone nome="check" tamanho={22} />
        </button>
      </div>

      {/* Referência da última vez e marcação de recorde */}
      <div className="mt-1.5 flex items-center gap-2 pl-11 text-xs">
        {serie.recorde ? (
          <span className="flex items-center gap-1 font-bold text-lime-400">
            <Icone nome="trofeu" tamanho={13} />
            Novo recorde pessoal!
          </span>
        ) : serie.referencia ? (
          <span className="text-slate-500">
            Última vez: {formatarPeso(serie.referencia.peso)} × {serie.referencia.reps}
          </span>
        ) : (
          <span className="text-slate-600">Primeira vez neste exercício</span>
        )}

        {podeRemover && !concluida && (
          <button
            type="button"
            onClick={onRemover}
            className="ml-auto text-slate-500 underline underline-offset-2 hover:text-danger"
          >
            Remover série
          </button>
        )}
      </div>
    </div>
  )
}
