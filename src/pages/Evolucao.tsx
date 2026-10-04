import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  Botao,
  Esqueleto,
  EstadoVazio,
  Estatistica,
  Selo,
  Seletor,
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { Calendario } from '@/components/evolucao/Calendario'
import {
  GraficoCarga,
  GraficoFrequencia,
  GraficoVolumeSemanal,
} from '@/components/graficos/Graficos'
import { useHistory, usePersonalRecords, useWeeklyStats } from '@/hooks/useHistory'
import { useExercises } from '@/hooks/useExercises'
import { supabase } from '@/lib/supabase'
import {
  formatarData,
  formatarDuracao,
  formatarPeso,
  formatarVolume,
} from '@/lib/format'
import type { ExerciseProgressRow } from '@/types/database'

type Aba = 'resumo' | 'carga' | 'recordes'

export function Evolucao() {
  const navegar = useNavigate()
  const { treinos, diasTreinados, sequencia, maiorSequencia, totais, carregando } = useHistory()
  const { dados: semanais, carregando: carregandoSemanais } = useWeeklyStats(12)
  const { recordes, carregando: carregandoRecordes } = usePersonalRecords()
  const { porId, exercicios } = useExercises()

  const [aba, setAba] = useState<Aba>('resumo')

  // Exercícios que já têm histórico — são os que valem plotar.
  const comHistorico = useMemo(() => {
    const ids = new Set(recordes.map((r) => r.exercise_id))
    return exercicios
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [exercicios, recordes])

  const [exercicioId, setExercicioId] = useState<string>('')
  const [progresso, setProgresso] = useState<ExerciseProgressRow[]>([])
  const [carregandoProgresso, setCarregandoProgresso] = useState(false)

  useEffect(() => {
    if (!exercicioId && comHistorico[0]) setExercicioId(comHistorico[0].id)
  }, [comHistorico, exercicioId])

  useEffect(() => {
    if (!exercicioId) return
    let ativo = true
    setCarregandoProgresso(true)
    supabase.rpc('exercise_progress', { p_exercise_id: exercicioId }).then(({ data }) => {
      if (!ativo) return
      setProgresso(
        ((data ?? []) as ExerciseProgressRow[]).map((d) => ({
          ...d,
          best_weight: Number(d.best_weight),
          volume_kg: Number(d.volume_kg),
        })),
      )
      setCarregandoProgresso(false)
    })
    return () => {
      ativo = false
    }
  }, [exercicioId])

  const semTreinos = !carregando && treinos.length === 0

  return (
    <AppShell titulo="Evolução" subtitulo={`${totais.treinos} treinos registrados`}>
      {semTreinos ? (
        <EstadoVazio
          icone="grafico"
          titulo="Sua evolução aparece aqui"
          descricao="Depois do primeiro treino finalizado você vê calendário, sequência de dias, volume semanal e seus recordes."
          acao={
            <Botao blocoCompleto icone="play" onClick={() => navegar('/')}>
              Iniciar um treino
            </Botao>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Abas ------------------------------------------------------- */}
          <div
            role="tablist"
            aria-label="Seções da evolução"
            className="flex gap-1 rounded-xl bg-base-800 p-1"
          >
            {(
              [
                ['resumo', 'Resumo'],
                ['carga', 'Carga'],
                ['recordes', 'Recordes'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                role="tab"
                type="button"
                aria-selected={aba === valor}
                onClick={() => setAba(valor)}
                className={cx(
                  'min-h-[44px] flex-1 rounded-lg text-sm font-semibold transition-colors',
                  aba === valor
                    ? 'bg-lime-400 text-base-900'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {/* ---------------------------------------------------- RESUMO */}
          {aba === 'resumo' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Estatistica
                  rotulo="Sequência atual"
                  valor={sequencia}
                  sufixo={sequencia === 1 ? 'dia' : 'dias'}
                  icone="fogo"
                />
                <Estatistica
                  rotulo="Melhor sequência"
                  valor={maiorSequencia}
                  sufixo={maiorSequencia === 1 ? 'dia' : 'dias'}
                  icone="trofeu"
                />
                <Estatistica rotulo="Volume total" valor={formatarVolume(totais.volume)} icone="grafico" />
                <Estatistica rotulo="Séries" valor={totais.series} icone="halter" />
              </div>

              <section aria-labelledby="t-calendario">
                <h2 id="t-calendario" className="titulo-secao">
                  Dias treinados
                </h2>
                {carregando && treinos.length === 0 ? (
                  <Esqueleto className="h-80" />
                ) : (
                  <Calendario diasTreinados={diasTreinados} />
                )}
              </section>

              <section aria-labelledby="t-volume">
                <h2 id="t-volume" className="titulo-secao">
                  Volume semanal (séries × reps × carga)
                </h2>
                {carregandoSemanais ? (
                  <Esqueleto className="h-52" />
                ) : (
                  <GraficoVolumeSemanal dados={semanais} />
                )}
              </section>

              <section aria-labelledby="t-frequencia">
                <h2 id="t-frequencia" className="titulo-secao">
                  Frequência semanal
                </h2>
                {carregandoSemanais ? (
                  <Esqueleto className="h-44" />
                ) : (
                  <GraficoFrequencia dados={semanais} />
                )}
              </section>

              <section aria-labelledby="t-historico">
                <h2 id="t-historico" className="titulo-secao">
                  Histórico de treinos
                </h2>
                <ul className="flex flex-col gap-2">
                  {treinos.slice(0, 20).map((t) => (
                    <li key={t.id} className="card flex items-center gap-3 p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-700 text-lime-400">
                        <Icone nome="check" tamanho={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-100">{t.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatarData(t.started_at)} · {t.series} séries ·{' '}
                          {formatarVolume(t.volume_kg)}
                        </p>
                      </div>
                      {t.duration_seconds != null && (
                        <span className="shrink-0 text-xs tabular-nums text-slate-400">
                          {formatarDuracao(t.duration_seconds)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {treinos.length > 20 && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Mostrando os 20 treinos mais recentes de {treinos.length}.
                  </p>
                )}
              </section>
            </>
          )}

          {/* ----------------------------------------------------- CARGA */}
          {aba === 'carga' && (
            <>
              {comHistorico.length === 0 ? (
                <EstadoVazio
                  icone="grafico"
                  titulo="Nenhum exercício com histórico"
                  descricao="Conclua séries com carga para acompanhar a evolução por exercício."
                />
              ) : (
                <>
                  <div>
                    <label htmlFor="sel-exercicio" className="label">
                      Exercício
                    </label>
                    <Seletor
                      id="sel-exercicio"
                      value={exercicioId}
                      onChange={(e) => setExercicioId(e.target.value)}
                    >
                      {comHistorico.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </Seletor>
                  </div>

                  {carregandoProgresso ? (
                    <Esqueleto className="h-56" />
                  ) : (
                    <>
                      <GraficoCarga dados={progresso} />

                      {progresso.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <Estatistica
                            rotulo="Melhor carga"
                            valor={formatarPeso(
                              Math.max(...progresso.map((p) => p.best_weight)),
                            )}
                            icone="trofeu"
                          />
                          <Estatistica
                            rotulo="Sessões"
                            valor={progresso.length}
                            icone="calendario"
                          />
                        </div>
                      )}

                      {progresso.length >= 2 && (
                        <VariacaoCarga progresso={progresso} />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* -------------------------------------------------- RECORDES */}
          {aba === 'recordes' && (
            <>
              {carregandoRecordes ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Esqueleto key={i} className="h-16" />
                  ))}
                </div>
              ) : recordes.length === 0 ? (
                <EstadoVazio
                  icone="trofeu"
                  titulo="Nenhum recorde ainda"
                  descricao="O recorde pessoal é a maior carga registrada em cada exercício. Ele aparece automaticamente quando você supera a marca anterior."
                />
              ) : (
                <>
                  <p className="flex items-start gap-2 rounded-xl bg-base-800 p-3 text-xs text-slate-400">
                    <Icone nome="info" tamanho={15} className="mt-0.5 shrink-0" />
                    O recorde é a maior carga já registrada em cada exercício, com as repetições
                    daquela série.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {recordes.map((recorde) => {
                      const exercicio = porId.get(recorde.exercise_id)
                      return (
                        <li
                          key={recorde.exercise_id}
                          className="card flex items-center gap-3 p-3.5"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/15 text-lime-400">
                            <Icone nome="trofeu" tamanho={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-100">
                              {exercicio?.name ?? 'Exercício'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatarData(recorde.performed_at)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold tabular-nums text-lime-400">
                              {formatarPeso(recorde.weight_kg)}
                            </p>
                            <p className="text-xs text-slate-400">{recorde.reps} reps</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </>
          )}

          <Link
            to="/medidas"
            className="card flex items-center gap-3 p-4 transition-colors hover:border-lime-400/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-700 text-lime-400">
              <Icone nome="regua" tamanho={18} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-100">Medidas corporais</p>
              <p className="text-xs text-slate-400">Peso, peito, cintura, braço e coxa</p>
            </div>
            <Icone nome="seta_dir" className="shrink-0 text-slate-500" />
          </Link>
        </div>
      )}
    </AppShell>
  )
}

/** Diferença entre a primeira e a última sessão do exercício selecionado. */
function VariacaoCarga({ progresso }: { progresso: ExerciseProgressRow[] }) {
  const primeiro = progresso[0]
  const ultimo = progresso[progresso.length - 1]
  if (!primeiro || !ultimo) return null

  const delta = ultimo.best_weight - primeiro.best_weight
  const percentual = primeiro.best_weight > 0 ? (delta / primeiro.best_weight) * 100 : 0

  return (
    <div className="card flex items-center gap-3 p-4">
      <Selo tom={delta > 0 ? 'ok' : delta < 0 ? 'perigo' : 'neutro'}>
        <Icone nome={delta >= 0 ? 'seta_cima' : 'seta_baixo'} tamanho={12} />
        {delta >= 0 ? '+' : ''}
        {formatarPeso(delta)}
      </Selo>
      <p className="text-sm text-slate-300">
        {delta > 0
          ? `Você subiu ${Math.abs(percentual).toFixed(0)}% de carga desde a primeira sessão.`
          : delta < 0
            ? 'A carga está abaixo da primeira sessão registrada.'
            : 'A carga está igual à primeira sessão registrada.'}
      </p>
    </div>
  )
}
