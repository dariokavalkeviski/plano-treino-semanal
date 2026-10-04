import { Botao, Estatistica } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { formatarDuracao, formatarPeso, formatarVolume } from '@/lib/format'
import type { ResumoTreino } from '@/hooks/useActiveWorkout'

/** Tela de encerramento com os números da sessão e os recordes batidos. */
export function ResumoFinal({
  resumo,
  onFechar,
}: {
  resumo: ResumoTreino
  onFechar: () => void
}) {
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-lime-400/15
            text-lime-400 animate-pr-pop"
        >
          <Icone nome="check" tamanho={40} />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-100">Treino concluído!</h2>
        <p className="mt-1 text-sm text-slate-400">{resumo.nome}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Estatistica
          rotulo="Duração"
          valor={formatarDuracao(resumo.duracaoSegundos)}
          icone="relogio"
        />
        <Estatistica rotulo="Séries" valor={resumo.seriesConcluidas} icone="halter" />
        <Estatistica rotulo="Volume" valor={formatarVolume(resumo.volumeKg)} icone="grafico" />
        <Estatistica rotulo="Repetições" valor={resumo.repsTotais} icone="alvo" />
      </div>

      {resumo.recordes.length > 0 && (
        <section
          aria-labelledby="titulo-recordes"
          className="card border-lime-400/40 bg-lime-400/10 p-4 animate-pr-pop"
        >
          <h3
            id="titulo-recordes"
            className="mb-3 flex items-center gap-2 text-sm font-bold text-lime-300"
          >
            <Icone nome="trofeu" tamanho={18} />
            {resumo.recordes.length === 1
              ? 'Você bateu 1 recorde pessoal!'
              : `Você bateu ${resumo.recordes.length} recordes pessoais!`}
          </h3>
          <ul className="flex flex-col gap-2">
            {resumo.recordes.map((recorde, indice) => (
              <li
                key={`${recorde.exercicio}-${indice}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-slate-100">{recorde.exercicio}</span>
                <span className="shrink-0 font-bold tabular-nums text-lime-400">
                  {formatarPeso(recorde.peso)} × {recorde.reps}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resumo.seriesConcluidas === 0 && (
        <p className="rounded-xl bg-base-800 p-4 text-sm leading-relaxed text-slate-400">
          Nenhuma série foi registrada nesta sessão. O treino fica no histórico com duração, mas sem
          volume.
        </p>
      )}

      <p className="text-center text-sm text-slate-400">
        {resumo.exerciciosTrabalhados > 0 &&
          `${resumo.exerciciosTrabalhados} ${
            resumo.exerciciosTrabalhados === 1 ? 'exercício' : 'exercícios'
          } trabalhados. `}
        Descanse bem e volte forte.
      </p>

      <Botao blocoCompleto onClick={onFechar}>
        Voltar ao início
      </Botao>
    </div>
  )
}
