import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  AvisoErro,
  Botao,
  Esqueleto,
  EstadoVazio,
  Estatistica,
  Selo,
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useRoutines } from '@/hooks/useRoutines'
import { useHistory } from '@/hooks/useHistory'
import { useActiveWorkout } from '@/hooks/useActiveWorkout'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import { liberarAudio } from '@/lib/feedback'
import { traduzirErro } from '@/lib/supabase'
import {
  formatarData,
  formatarDuracao,
  formatarVolume,
  nomeDiaSemana,
  paraDataISO,
} from '@/lib/format'
import type { RoutineWithExercises } from '@/types/database'

/**
 * Sugestão de "treino de hoje": a rotina que está há mais tempo sem ser
 * executada. Sem histórico, sugere a primeira da lista.
 */
function sugerirRotina(
  rotinas: RoutineWithExercises[],
  ultimaPorRotina: Map<string, string>,
): RoutineWithExercises | null {
  const comExercicios = rotinas.filter((r) => r.routine_exercises.length > 0)
  if (comExercicios.length === 0) return rotinas[0] ?? null

  return (
    [...comExercicios].sort((a, b) => {
      const dataA = ultimaPorRotina.get(a.id) ?? ''
      const dataB = ultimaPorRotina.get(b.id) ?? ''
      if (dataA === dataB) return a.position - b.position
      return dataA.localeCompare(dataB)
    })[0] ?? null
  )
}

export function Inicio() {
  const navegar = useNavigate()
  const toast = useToast()
  const { profile } = useProfile()
  const { rotinas, carregando: carregandoRotinas, erro, recarregar } = useRoutines()
  const { treinos, sequencia, totais, carregando: carregandoHistorico } = useHistory()
  const { treino, iniciar, progresso } = useActiveWorkout()
  const [iniciando, setIniciando] = useState(false)

  const ultimaPorRotina = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const t of treinos) {
      if (!t.routine_id) continue
      const atual = mapa.get(t.routine_id)
      if (!atual || t.started_at > atual) mapa.set(t.routine_id, t.started_at)
    }
    return mapa
  }, [treinos])

  const sugestao = useMemo(() => sugerirRotina(rotinas, ultimaPorRotina), [rotinas, ultimaPorRotina])

  const treinouHoje = useMemo(() => {
    const hoje = paraDataISO(new Date())
    return treinos.some((t) => paraDataISO(new Date(t.started_at)) === hoje)
  }, [treinos])

  const primeiroNome = (profile?.name ?? '').trim().split(' ')[0] ?? ''

  async function aoIniciar(rotina: RoutineWithExercises) {
    liberarAudio()
    setIniciando(true)
    try {
      await iniciar(rotina)
      navegar('/treino-ativo')
    } catch (e) {
      toast.erro('Não foi possível iniciar', traduzirErro(e))
    } finally {
      setIniciando(false)
    }
  }

  const hoje = new Date()

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {/* Saudação ------------------------------------------------------- */}
        <div>
          <p className="text-sm text-slate-400">
            {nomeDiaSemana(hoje)}, {formatarData(paraDataISO(hoje))}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold text-slate-100">
            {primeiroNome ? `E aí, ${primeiroNome}!` : 'Vamos treinar!'}
          </h2>
        </div>

        {/* Treino em andamento ------------------------------------------- */}
        {treino && (
          <Link
            to="/treino-ativo"
            className="card block border-lime-400/40 bg-lime-400/10 p-4 animate-pulse-ring"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-base-900">
                <Icone nome="play" tamanho={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-lime-400">
                  Treino em andamento
                </p>
                <p className="truncate font-semibold text-slate-100">{treino.nome}</p>
                <p className="text-sm text-slate-300">
                  {progresso.feitas} de {progresso.total} séries concluídas
                </p>
              </div>
              <Icone nome="seta_dir" className="shrink-0 text-lime-400" />
            </div>
          </Link>
        )}

        {/* Treino de hoje ------------------------------------------------- */}
        {!treino && (
          <section aria-labelledby="titulo-hoje">
            <h3 id="titulo-hoje" className="titulo-secao">
              Treino de hoje
            </h3>

            {erro && !carregandoRotinas && rotinas.length === 0 ? (
              <AvisoErro mensagem={traduzirErro(erro)} onTentarDeNovo={recarregar} />
            ) : carregandoRotinas && rotinas.length === 0 ? (
              <Esqueleto className="h-44 w-full" />
            ) : !sugestao ? (
              <EstadoVazio
                icone="lista"
                titulo="Nenhuma rotina ainda"
                descricao="Crie sua primeira rotina (Treino A, Push, Pernas…) para começar a registrar os treinos."
                acao={
                  <Botao blocoCompleto icone="mais" onClick={() => navegar('/treinos')}>
                    Criar rotina
                  </Botao>
                }
              />
            ) : (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-br from-lime-400/20 to-transparent p-5">
                  <div className="mb-1 flex items-center gap-2">
                    {treinouHoje && <Selo tom="ok">Já treinou hoje</Selo>}
                    {ultimaPorRotina.has(sugestao.id) ? (
                      <Selo>Último: {formatarData(ultimaPorRotina.get(sugestao.id)!)}</Selo>
                    ) : (
                      <Selo tom="destaque">Nunca executada</Selo>
                    )}
                  </div>
                  <h4 className="text-2xl font-bold text-slate-100">{sugestao.name}</h4>
                  <p className="mt-1 text-sm text-slate-300">
                    {sugestao.routine_exercises.length}{' '}
                    {sugestao.routine_exercises.length === 1 ? 'exercício' : 'exercícios'}
                    {' · '}
                    {sugestao.routine_exercises.reduce((s, i) => s + i.target_sets, 0)} séries
                  </p>

                  {sugestao.routine_exercises.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1">
                      {sugestao.routine_exercises.slice(0, 4).map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />
                          <span className="truncate">{item.exercise?.name ?? 'Exercício'}</span>
                          <span className="ml-auto shrink-0 text-xs text-slate-400">
                            {item.target_sets}×{item.target_reps_min}-{item.target_reps_max}
                          </span>
                        </li>
                      ))}
                      {sugestao.routine_exercises.length > 4 && (
                        <li className="pl-3.5 text-xs text-slate-400">
                          +{sugestao.routine_exercises.length - 4} exercícios
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="flex gap-2 border-t border-white/5 p-4">
                  <Botao
                    icone="play"
                    blocoCompleto
                    carregando={iniciando}
                    disabled={sugestao.routine_exercises.length === 0}
                    onClick={() => void aoIniciar(sugestao)}
                  >
                    Iniciar treino
                  </Botao>
                  <Botao
                    variante="secundario"
                    onClick={() => navegar(`/treinos/${sugestao.id}`)}
                    aria-label="Editar rotina"
                  >
                    <Icone nome="lapis" />
                  </Botao>
                </div>

                {sugestao.routine_exercises.length === 0 && (
                  <p className="border-t border-white/5 px-4 py-3 text-sm text-warn">
                    Esta rotina ainda não tem exercícios. Toque no lápis para montá-la.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Outras rotinas ------------------------------------------------- */}
        {!treino && rotinas.length > 1 && (
          <section aria-labelledby="titulo-outras">
            <h3 id="titulo-outras" className="titulo-secao">
              Outras rotinas
            </h3>
            <div className="scroll-x">
              {rotinas
                .filter((r) => r.id !== sugestao?.id)
                .map((rotina) => (
                  <button
                    key={rotina.id}
                    type="button"
                    disabled={rotina.routine_exercises.length === 0 || iniciando}
                    onClick={() => void aoIniciar(rotina)}
                    className={cx(
                      'card min-h-[48px] shrink-0 px-4 py-3 text-left transition-colors',
                      'hover:border-lime-400/40 disabled:opacity-50',
                    )}
                  >
                    <p className="font-semibold text-slate-100">{rotina.name}</p>
                    <p className="text-xs text-slate-400">
                      {rotina.routine_exercises.length} exercícios
                    </p>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* Resumo -------------------------------------------------------- */}
        <section aria-labelledby="titulo-resumo">
          <h3 id="titulo-resumo" className="titulo-secao">
            Seus números
          </h3>
          {carregandoHistorico && treinos.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <Esqueleto className="h-[86px]" />
              <Esqueleto className="h-[86px]" />
              <Esqueleto className="h-[86px]" />
              <Esqueleto className="h-[86px]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Estatistica
                rotulo="Sequência"
                valor={sequencia}
                sufixo={sequencia === 1 ? 'dia' : 'dias'}
                icone="fogo"
              />
              <Estatistica rotulo="Treinos" valor={totais.treinos} icone="halter" />
              <Estatistica rotulo="Volume total" valor={formatarVolume(totais.volume)} icone="grafico" />
              <Estatistica
                rotulo="Tempo total"
                valor={formatarDuracao(totais.minutos * 60)}
                icone="relogio"
              />
            </div>
          )}
        </section>

        {/* Últimos treinos ----------------------------------------------- */}
        {treinos.length > 0 && (
          <section aria-labelledby="titulo-ultimos">
            <div className="mb-3 flex items-center justify-between">
              <h3 id="titulo-ultimos" className="titulo-secao mb-0">
                Últimos treinos
              </h3>
              <Link
                to="/evolucao"
                className="text-sm font-semibold text-lime-400 underline underline-offset-4"
              >
                Ver tudo
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {treinos.slice(0, 3).map((t) => (
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
          </section>
        )}
      </div>
    </AppShell>
  )
}
