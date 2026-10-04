import { useMemo, useState } from 'react'
import { BotaoIcone, cx } from '@/components/ui'
import { nomeMes, paraDataISO } from '@/lib/format'

/**
 * Calendário mensal com os dias treinados em destaque.
 * A semana começa na segunda-feira, como no cálculo de volume do banco.
 */
export function Calendario({ diasTreinados }: { diasTreinados: Set<string> }) {
  const [referencia, setReferencia] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  const hojeISO = paraDataISO(new Date())

  const celulas = useMemo(() => {
    const ano = referencia.getFullYear()
    const mes = referencia.getMonth()
    const primeiro = new Date(ano, mes, 1)
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    // Deslocamento para a grade começar na segunda-feira.
    const inicio = (primeiro.getDay() + 6) % 7

    const lista: (Date | null)[] = Array.from({ length: inicio }, () => null)
    for (let dia = 1; dia <= diasNoMes; dia++) {
      lista.push(new Date(ano, mes, dia))
    }
    return lista
  }, [referencia])

  const totalNoMes = useMemo(
    () =>
      celulas.filter((d) => d && diasTreinados.has(paraDataISO(d))).length,
    [celulas, diasTreinados],
  )

  function mudarMes(delta: number) {
    setReferencia((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1))
  }

  const ehMesAtual =
    referencia.getFullYear() === new Date().getFullYear() &&
    referencia.getMonth() === new Date().getMonth()

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <BotaoIcone
          nome="seta_esq"
          rotulo="Mês anterior"
          tamanho={18}
          onClick={() => mudarMes(-1)}
          className="h-9 w-9"
        />
        <div className="text-center">
          <p className="font-bold text-slate-100">{nomeMes(referencia)}</p>
          <p className="text-xs text-slate-400">
            {totalNoMes} {totalNoMes === 1 ? 'treino' : 'treinos'}
          </p>
        </div>
        <BotaoIcone
          nome="seta_dir"
          rotulo="Mês seguinte"
          tamanho={18}
          onClick={() => mudarMes(1)}
          disabled={ehMesAtual}
          className="h-9 w-9"
        />
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Treinos de ${nomeMes(referencia)}`}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((inicial, indice) => (
          <div
            key={`cab-${indice}`}
            role="columnheader"
            className="pb-1 text-center text-[10px] font-bold uppercase text-slate-500"
          >
            {inicial}
          </div>
        ))}

        {celulas.map((dia, indice) => {
          if (!dia) return <div key={`vazio-${indice}`} role="gridcell" />
          const iso = paraDataISO(dia)
          const treinou = diasTreinados.has(iso)
          const ehHoje = iso === hojeISO

          return (
            <div
              key={iso}
              role="gridcell"
              aria-label={`${dia.getDate()} de ${nomeMes(dia)}${treinou ? ', treinou' : ''}`}
              className={cx(
                'flex aspect-square items-center justify-center rounded-lg text-sm font-semibold tabular-nums',
                treinou
                  ? 'bg-lime-400 text-base-900'
                  : ehHoje
                    ? 'border border-lime-400/50 text-lime-400'
                    : 'bg-base-700 text-slate-400',
              )}
            >
              {dia.getDate()}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-lime-400" />
          Treinou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-lime-400/50" />
          Hoje
        </span>
      </div>
    </div>
  )
}
