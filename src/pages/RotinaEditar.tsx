import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  Botao,
  BotaoIcone,
  Confirmacao,
  EstadoVazio,
  Modal,
  Selo,
  TelaCarregando,
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { AlcaArraste, ListaOrdenavel } from '@/components/ui/ListaOrdenavel'
import { SeletorExercicios } from '@/components/rotinas/SeletorExercicios'
import { EditorExercicioRotina } from '@/components/rotinas/EditorExercicioRotina'
import { useRoutines } from '@/hooks/useRoutines'
import { useExercises } from '@/hooks/useExercises'
import { useActiveWorkout } from '@/hooks/useActiveWorkout'
import { useToast } from '@/hooks/useToast'
import { traduzirErro } from '@/lib/supabase'
import { formatarDuracao } from '@/lib/format'
import { liberarAudio } from '@/lib/feedback'
import { muscleGroupLabel, type RoutineExerciseWithExercise } from '@/types/database'

export function RotinaEditar() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const toast = useToast()
  const {
    rotinas,
    carregando,
    adicionarExercicios,
    atualizarExercicio,
    removerExercicio,
    reordenarExercicios,
  } = useRoutines()
  const { exercicios, porId } = useExercises()
  const { iniciar } = useActiveWorkout()

  const [seletorAberto, setSeletorAberto] = useState(false)
  const [editandoItem, setEditandoItem] = useState<RoutineExerciseWithExercise | null>(null)
  const [removendo, setRemovendo] = useState<RoutineExerciseWithExercise | null>(null)
  const [iniciando, setIniciando] = useState(false)

  const rotina = useMemo(() => rotinas.find((r) => r.id === id) ?? null, [rotinas, id])

  if (carregando && !rotina) {
    return (
      <AppShell comVoltar titulo="Rotina">
        <TelaCarregando />
      </AppShell>
    )
  }

  if (!rotina) {
    return (
      <AppShell comVoltar titulo="Rotina não encontrada">
        <EstadoVazio
          icone="alerta"
          titulo="Rotina não encontrada"
          descricao="Ela pode ter sido excluída em outro aparelho."
          acao={
            <Botao blocoCompleto onClick={() => navegar('/treinos')}>
              Voltar para Treinos
            </Botao>
          }
        />
      </AppShell>
    )
  }

  const itens = rotina.routine_exercises
  const totalSeries = itens.reduce((s, i) => s + i.target_sets, 0)
  // Estimativa grosseira: ~40s de execução por série + o descanso configurado.
  const duracaoEstimada = itens.reduce(
    (s, i) => s + i.target_sets * (40 + i.rest_seconds),
    0,
  )

  async function aoAdicionar(ids: string[]) {
    try {
      await adicionarExercicios(
        rotina!.id,
        ids.map((exercise_id) => ({
          exercise_id,
          target_sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          rest_seconds: 90,
        })),
        porId,
      )
      setSeletorAberto(false)
      toast.sucesso(
        ids.length === 1 ? 'Exercício adicionado' : `${ids.length} exercícios adicionados`,
      )
    } catch (e) {
      toast.erro('Não foi possível adicionar', traduzirErro(e))
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return
    try {
      await removerExercicio(rotina!.id, removendo.id)
      setRemovendo(null)
      toast.sucesso('Exercício removido da rotina')
    } catch (e) {
      toast.erro('Não foi possível remover', traduzirErro(e))
    }
  }

  async function aoIniciar() {
    if (!rotina) return
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

  return (
    <AppShell
      comVoltar
      titulo={rotina.name}
      subtitulo={
        itens.length === 0
          ? 'Sem exercícios'
          : `${itens.length} exercícios · ${totalSeries} séries · ~${formatarDuracao(duracaoEstimada)}`
      }
      acao={
        <BotaoIcone
          nome="mais"
          rotulo="Adicionar exercícios"
          onClick={() => setSeletorAberto(true)}
          className="bg-lime-400 text-base-900 hover:bg-lime-300 hover:text-base-900"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {itens.length === 0 ? (
          <EstadoVazio
            icone="halter"
            titulo="Adicione exercícios"
            descricao="Escolha os exercícios desta rotina e defina séries, repetições alvo e tempo de descanso."
            acao={
              <Botao blocoCompleto icone="mais" onClick={() => setSeletorAberto(true)}>
                Escolher exercícios
              </Botao>
            }
          />
        ) : (
          <>
            <p className="flex items-start gap-2 rounded-xl bg-base-800 p-3 text-xs text-slate-400">
              <Icone nome="info" tamanho={15} className="mt-0.5 shrink-0" />
              Arraste pela alça para reordenar, ou use as setas. Toque no exercício para ajustar
              séries, repetições e descanso.
            </p>

            <ListaOrdenavel
              itens={itens}
              onReordenar={(ids) => void reordenarExercicios(rotina.id, ids)}
            >
              {(item, { propsAlca, arrastando, mover, podeSubir, podeDescer, indice }) => (
                <div
                  className={cx(
                    'card flex items-center gap-1 p-2 pl-0',
                    arrastando && 'border-lime-400/50 shadow-glow',
                  )}
                >
                  <AlcaArraste
                    propsAlca={propsAlca}
                    rotulo={`Arrastar ${item.exercise?.name ?? 'exercício'}`}
                  />

                  <button
                    type="button"
                    onClick={() => setEditandoItem(item)}
                    className="min-w-0 flex-1 rounded-lg py-1.5 pr-1 text-left"
                  >
                    <p className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
                        {indice + 1}
                      </span>
                      <span className="truncate font-semibold text-slate-100">
                        {item.exercise?.name ?? 'Exercício removido'}
                      </span>
                    </p>
                    <p className="mt-0.5 pl-5 text-xs text-slate-400">
                      {item.target_sets} ×{' '}
                      {item.target_reps_min === item.target_reps_max
                        ? item.target_reps_min
                        : `${item.target_reps_min}-${item.target_reps_max}`}{' '}
                      reps · descanso {item.rest_seconds}s
                      {item.exercise && ` · ${muscleGroupLabel(item.exercise.muscle_group)}`}
                    </p>
                    {item.notes && (
                      <p className="mt-1 pl-5 text-xs italic text-slate-500">{item.notes}</p>
                    )}
                  </button>

                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => mover(-1)}
                      disabled={!podeSubir}
                      aria-label={`Mover ${item.exercise?.name ?? 'exercício'} para cima`}
                      className="flex h-6 w-9 items-center justify-center rounded text-slate-500
                        hover:bg-white/5 hover:text-slate-200 disabled:opacity-25"
                    >
                      <Icone nome="seta_cima" tamanho={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(1)}
                      disabled={!podeDescer}
                      aria-label={`Mover ${item.exercise?.name ?? 'exercício'} para baixo`}
                      className="flex h-6 w-9 items-center justify-center rounded text-slate-500
                        hover:bg-white/5 hover:text-slate-200 disabled:opacity-25"
                    >
                      <Icone nome="seta_baixo" tamanho={16} />
                    </button>
                  </div>

                  <BotaoIcone
                    nome="lixeira"
                    rotulo={`Remover ${item.exercise?.name ?? 'exercício'} da rotina`}
                    tamanho={17}
                    onClick={() => setRemovendo(item)}
                    className="h-9 w-9 hover:bg-danger/15 hover:text-danger"
                  />
                </div>
              )}
            </ListaOrdenavel>

            <Botao variante="secundario" blocoCompleto icone="mais" onClick={() => setSeletorAberto(true)}>
              Adicionar mais exercícios
            </Botao>

            <Botao icone="play" blocoCompleto carregando={iniciando} onClick={() => void aoIniciar()}>
              Iniciar este treino
            </Botao>
          </>
        )}
      </div>

      {/* Seletor de exercícios -------------------------------------------- */}
      <Modal
        aberto={seletorAberto}
        titulo="Adicionar exercícios"
        onFechar={() => setSeletorAberto(false)}
      >
        <SeletorExercicios
          exercicios={exercicios}
          jaNaRotina={new Set(itens.map((i) => i.exercise_id))}
          onConfirmar={aoAdicionar}
          onCancelar={() => setSeletorAberto(false)}
        />
      </Modal>

      {/* Ajuste de séries/reps/descanso ----------------------------------- */}
      <Modal
        aberto={editandoItem !== null}
        titulo={editandoItem?.exercise?.name ?? 'Exercício'}
        onFechar={() => setEditandoItem(null)}
      >
        {editandoItem && (
          <EditorExercicioRotina
            item={editandoItem}
            onCancelar={() => setEditandoItem(null)}
            onSalvar={async (dados) => {
              await atualizarExercicio(rotina.id, editandoItem.id, dados)
              setEditandoItem(null)
              toast.sucesso('Exercício atualizado')
            }}
          />
        )}
      </Modal>

      <Confirmacao
        aberto={removendo !== null}
        titulo="Remover da rotina"
        mensagem={`"${removendo?.exercise?.name}" sai desta rotina. O exercício continua na sua biblioteca.`}
        textoConfirmar="Remover"
        perigoso
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => setRemovendo(null)}
      />

      {itens.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Selo>Dica</Selo>
          Ordene os compostos primeiro e os isolados no fim.
        </div>
      )}
    </AppShell>
  )
}
