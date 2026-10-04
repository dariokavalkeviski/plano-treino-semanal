import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  BarraProgresso,
  Botao,
  Confirmacao,
  EstadoVazio,
  Selo,
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { LinhaSerie } from '@/components/treino/LinhaSerie'
import { CronometroDescanso } from '@/components/treino/CronometroDescanso'
import { ResumoFinal } from '@/components/treino/ResumoFinal'
import { useActiveWorkout, type ResumoTreino } from '@/hooks/useActiveWorkout'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useToast } from '@/hooks/useToast'
import { celebrarRecorde, liberarAudio } from '@/lib/feedback'
import { traduzirErro } from '@/lib/supabase'
import { formatarDuracao } from '@/lib/format'
import { muscleGroupLabel as rotuloGrupo } from '@/types/database'

export function TreinoAtivo() {
  const navegar = useNavigate()
  const toast = useToast()
  const {
    treino,
    duracaoSegundos,
    progresso,
    ajustarSerie,
    concluirSerie,
    desfazerSerie,
    adicionarSerie,
    removerSerie,
    finalizar,
    descartar,
  } = useActiveWorkout()
  const descanso = useRestTimer()

  const [confirmarFim, setConfirmarFim] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [resumo, setResumo] = useState<ResumoTreino | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const containers = useRef(new Map<string, HTMLElement>())

  // Libera o áudio no primeiro toque: sem isso o iOS silencia o aviso.
  useEffect(() => {
    function aoTocar() {
      liberarAudio()
      window.removeEventListener('pointerdown', aoTocar)
    }
    window.addEventListener('pointerdown', aoTocar, { once: true })
    return () => window.removeEventListener('pointerdown', aoTocar)
  }, [])

  // Avisa antes de fechar a aba com treino aberto.
  useEffect(() => {
    if (!treino) return
    function aoSair(evento: BeforeUnloadEvent) {
      evento.preventDefault()
      evento.returnValue = ''
    }
    window.addEventListener('beforeunload', aoSair)
    return () => window.removeEventListener('beforeunload', aoSair)
  }, [treino])

  if (resumo) {
    return (
      <AppShell semNavegacao titulo="Treino concluído">
        <ResumoFinal resumo={resumo} onFechar={() => navegar('/', { replace: true })} />
      </AppShell>
    )
  }

  if (!treino) {
    return (
      <AppShell titulo="Treino">
        <EstadoVazio
          icone="halter"
          titulo="Nenhum treino em andamento"
          descricao="Escolha uma rotina na tela inicial e toque em Iniciar treino."
          acao={
            <Botao blocoCompleto onClick={() => navegar('/', { replace: true })}>
              Ir para o início
            </Botao>
          }
        />
      </AppShell>
    )
  }

  async function aoConcluirSerie(indiceExercicio: number, serieId: string) {
    const exercicio = treino!.exercicios[indiceExercicio]
    if (!exercicio) return
    try {
      const { recorde } = await concluirSerie(indiceExercicio, serieId)
      if (recorde) {
        celebrarRecorde()
        toast.recorde(
          'Novo recorde pessoal!',
          `${exercicio.exercise.name} — maior carga já registrada.`,
        )
      }
      // Só inicia o descanso se ainda houver série pendente neste exercício.
      const restantes = exercicio.series.filter((s) => !s.concluida && s.id !== serieId).length
      if (exercicio.restSeconds > 0 && restantes > 0) {
        descanso.iniciar(exercicio.restSeconds)
      }
    } catch (e) {
      toast.erro('Erro ao salvar a série', traduzirErro(e))
    }
  }

  async function aoFinalizar() {
    setFinalizando(true)
    try {
      const final = await finalizar()
      descanso.cancelar()
      setConfirmarFim(false)
      if (final) setResumo(final)
      else navegar('/', { replace: true })
    } catch (e) {
      toast.erro('Não foi possível finalizar', traduzirErro(e))
    } finally {
      setFinalizando(false)
    }
  }

  async function aoDescartar() {
    try {
      await descartar()
      descanso.cancelar()
      setConfirmarDescarte(false)
      toast.info('Treino descartado')
      navegar('/', { replace: true })
    } catch (e) {
      toast.erro('Não foi possível descartar', traduzirErro(e))
    }
  }

  function irParaProximo(indiceAtual: number) {
    const proximo = treino!.exercicios[indiceAtual + 1]
    if (!proximo) return
    containers.current.get(proximo.exercise.id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <AppShell
      semNavegacao
      titulo={treino.nome}
      subtitulo={`${formatarDuracao(duracaoSegundos)} · ${progresso.feitas}/${progresso.total} séries`}
      acao={
        <Botao variante="secundario" onClick={() => setConfirmarFim(true)} className="px-4">
          Finalizar
        </Botao>
      }
    >
      <div className={cx('flex flex-col gap-4', descanso.ativo && 'pb-24')}>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Progresso do treino</span>
            <span className="font-bold tabular-nums text-lime-400">{progresso.percentual}%</span>
          </div>
          <BarraProgresso percentual={progresso.percentual} rotulo="Progresso do treino" />
        </div>

        {treino.exercicios.map((exercicio, indiceExercicio) => {
          const feitas = exercicio.series.filter((s) => s.concluida).length
          const completo = feitas === exercicio.series.length && feitas > 0

          return (
            <section
              key={exercicio.exercise.id}
              ref={(el) => {
                if (el) containers.current.set(exercicio.exercise.id, el)
              }}
              aria-labelledby={`ex-${exercicio.exercise.id}`}
              className={cx(
                'card scroll-mt-28 overflow-hidden',
                completo && 'border-ok/25',
              )}
            >
              <div className="flex items-start gap-3 p-4 pb-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id={`ex-${exercicio.exercise.id}`}
                    className="text-base font-bold leading-snug text-slate-100"
                  >
                    {exercicio.exercise.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {rotuloGrupo(exercicio.exercise.muscle_group)} ·{' '}
                    <span className="capitalize">{exercicio.exercise.equipment}</span> · alvo{' '}
                    {exercicio.targetRepsMin === exercicio.targetRepsMax
                      ? exercicio.targetRepsMin
                      : `${exercicio.targetRepsMin}-${exercicio.targetRepsMax}`}{' '}
                    reps
                  </p>
                </div>
                {completo ? (
                  <Selo tom="ok">
                    <Icone nome="check" tamanho={12} />
                    Concluído
                  </Selo>
                ) : (
                  <Selo>
                    {feitas}/{exercicio.series.length}
                  </Selo>
                )}
              </div>

              <div className="flex flex-col gap-2 px-3 pb-3">
                {exercicio.series.map((serie) => (
                  <LinhaSerie
                    key={serie.id}
                    serie={serie}
                    podeRemover={exercicio.series.length > 1}
                    onMudarPeso={(peso) => ajustarSerie(indiceExercicio, serie.id, { peso })}
                    onMudarReps={(reps) => ajustarSerie(indiceExercicio, serie.id, { reps })}
                    onConcluir={() => void aoConcluirSerie(indiceExercicio, serie.id)}
                    onDesfazer={() => void desfazerSerie(indiceExercicio, serie.id)}
                    onRemover={() => void removerSerie(indiceExercicio, serie.id)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 border-t border-white/5 p-2">
                <button
                  type="button"
                  onClick={() => adicionarSerie(indiceExercicio)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5
                    rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  <Icone nome="mais" tamanho={16} />
                  Série extra
                </button>
                <button
                  type="button"
                  onClick={() => descanso.iniciar(exercicio.restSeconds)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5
                    rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  <Icone nome="relogio" tamanho={16} />
                  Descansar {exercicio.restSeconds}s
                </button>
                {completo && indiceExercicio < treino.exercicios.length - 1 && (
                  <button
                    type="button"
                    onClick={() => irParaProximo(indiceExercicio)}
                    className="flex min-h-[44px] items-center justify-center gap-1 rounded-lg
                      px-3 text-sm font-semibold text-lime-400 hover:bg-lime-400/10"
                  >
                    Próximo
                    <Icone nome="seta_baixo" tamanho={16} />
                  </button>
                )}
              </div>

              {exercicio.exercise.instructions && !completo && (
                <details className="border-t border-white/5">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-slate-400">
                    Como executar
                  </summary>
                  <p className="px-4 pb-3 text-xs leading-relaxed text-slate-400">
                    {exercicio.exercise.instructions}
                  </p>
                </details>
              )}
            </section>
          )
        })}

        <div className="flex flex-col gap-2 pt-2">
          <Botao icone="check" blocoCompleto onClick={() => setConfirmarFim(true)}>
            Finalizar treino
          </Botao>
          <Botao variante="fantasma" blocoCompleto onClick={() => setConfirmarDescarte(true)}>
            Descartar este treino
          </Botao>
        </div>
      </div>

      {descanso.ativo && (
        <CronometroDescanso
          restante={descanso.restante}
          total={descanso.total}
          onAjustar={descanso.ajustar}
          onCancelar={descanso.cancelar}
        />
      )}

      <Confirmacao
        aberto={confirmarFim}
        titulo="Finalizar treino"
        mensagem={
          progresso.feitas === 0
            ? 'Você ainda não concluiu nenhuma série. Finalizar agora registra um treino sem séries.'
            : `${progresso.feitas} de ${progresso.total} séries concluídas em ${formatarDuracao(duracaoSegundos)}. Finalizar agora?`
        }
        textoConfirmar="Finalizar"
        carregando={finalizando}
        onConfirmar={() => void aoFinalizar()}
        onCancelar={() => setConfirmarFim(false)}
      />

      <Confirmacao
        aberto={confirmarDescarte}
        titulo="Descartar treino"
        mensagem="As séries registradas nesta sessão serão apagadas. Esta ação não pode ser desfeita."
        textoConfirmar="Descartar"
        perigoso
        onConfirmar={() => void aoDescartar()}
        onCancelar={() => setConfirmarDescarte(false)}
      />
    </AppShell>
  )
}
