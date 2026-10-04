import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  AreaTexto,
  AvisoErro,
  Botao,
  BotaoIcone,
  Campo,
  Confirmacao,
  Entrada,
  Esqueleto,
  EstadoVazio,
  Modal,
  Selo,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useRoutines } from '@/hooks/useRoutines'
import { useActiveWorkout } from '@/hooks/useActiveWorkout'
import { useToast } from '@/hooks/useToast'
import { traduzirErro } from '@/lib/supabase'
import { liberarAudio } from '@/lib/feedback'
import { validarTexto } from '@/lib/validation'
import type { RoutineWithExercises } from '@/types/database'

const SUGESTOES = ['Treino A', 'Treino B', 'Treino C', 'Push', 'Pull', 'Legs', 'Full Body']

export function Treinos() {
  const navegar = useNavigate()
  const toast = useToast()
  const { rotinas, carregando, erro, criar, renomear, excluir, duplicar, recarregar } = useRoutines()
  const { iniciar, treino } = useActiveWorkout()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<RoutineWithExercises | null>(null)
  const [nome, setNome] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erroNome, setErroNome] = useState<string | undefined>()
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<RoutineWithExercises | null>(null)
  const [iniciandoId, setIniciandoId] = useState<string | null>(null)

  function abrirNova() {
    setEditando(null)
    setNome('')
    setObservacoes('')
    setErroNome(undefined)
    setModalAberto(true)
  }

  function abrirEdicao(rotina: RoutineWithExercises) {
    setEditando(rotina)
    setNome(rotina.name)
    setObservacoes(rotina.notes ?? '')
    setErroNome(undefined)
    setModalAberto(true)
  }

  async function salvar() {
    const validacao = validarTexto(nome, { min: 1, max: 60, rotulo: 'Nome da rotina' })
    setErroNome(validacao)
    if (validacao) return

    setSalvando(true)
    try {
      if (editando) {
        await renomear(editando.id, nome, observacoes.trim() || null)
        toast.sucesso('Rotina atualizada')
        setModalAberto(false)
      } else {
        const nova = await criar(nome, observacoes.trim() || null)
        setModalAberto(false)
        toast.sucesso('Rotina criada', 'Agora adicione os exercícios.')
        navegar(`/treinos/${nova.id}`)
      }
    } catch (e) {
      toast.erro('Não foi possível salvar', traduzirErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function aoDuplicar(rotina: RoutineWithExercises) {
    try {
      await duplicar(rotina.id)
      toast.sucesso('Rotina duplicada')
    } catch (e) {
      toast.erro('Não foi possível duplicar', traduzirErro(e))
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    try {
      await excluir(excluindo.id)
      toast.sucesso('Rotina excluída', 'Os treinos já registrados foram mantidos no histórico.')
      setExcluindo(null)
    } catch (e) {
      toast.erro('Não foi possível excluir', traduzirErro(e))
    }
  }

  async function aoIniciar(rotina: RoutineWithExercises) {
    liberarAudio()
    setIniciandoId(rotina.id)
    try {
      await iniciar(rotina)
      navegar('/treino-ativo')
    } catch (e) {
      toast.erro('Não foi possível iniciar', traduzirErro(e))
    } finally {
      setIniciandoId(null)
    }
  }

  return (
    <AppShell
      titulo="Treinos"
      subtitulo={rotinas.length > 0 ? `${rotinas.length} rotinas` : undefined}
      acao={
        <BotaoIcone
          nome="mais"
          rotulo="Criar rotina"
          onClick={abrirNova}
          className="bg-lime-400 text-base-900 hover:bg-lime-300 hover:text-base-900"
        />
      }
    >
      <div className="flex flex-col gap-3">
        {treino && (
          <button
            type="button"
            onClick={() => navegar('/treino-ativo')}
            className="card flex items-center gap-3 border-lime-400/40 bg-lime-400/10 p-4 text-left"
          >
            <Icone nome="play" className="shrink-0 text-lime-400" />
            <span className="flex-1 text-sm font-semibold text-slate-100">
              Voltar ao treino em andamento: {treino.nome}
            </span>
            <Icone nome="seta_dir" className="shrink-0 text-lime-400" />
          </button>
        )}

        {erro && rotinas.length === 0 ? (
          <AvisoErro mensagem={traduzirErro(erro)} onTentarDeNovo={recarregar} />
        ) : carregando && rotinas.length === 0 ? (
          <>
            <Esqueleto className="h-32" />
            <Esqueleto className="h-32" />
          </>
        ) : rotinas.length === 0 ? (
          <EstadoVazio
            icone="lista"
            titulo="Monte sua primeira rotina"
            descricao="Agrupe os exercícios do jeito que você treina: Treino A/B/C, Push/Pull/Legs ou por grupo muscular."
            acao={
              <Botao blocoCompleto icone="mais" onClick={abrirNova}>
                Criar rotina
              </Botao>
            }
          />
        ) : (
          rotinas.map((rotina) => {
            const totalSeries = rotina.routine_exercises.reduce((s, i) => s + i.target_sets, 0)
            const vazia = rotina.routine_exercises.length === 0

            return (
              <article key={rotina.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-slate-100">{rotina.name}</h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {vazia
                          ? 'Nenhum exercício'
                          : `${rotina.routine_exercises.length} exercícios · ${totalSeries} séries`}
                      </p>
                      {rotina.notes && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{rotina.notes}</p>
                      )}
                    </div>
                    {vazia && <Selo tom="alerta">Incompleta</Selo>}
                  </div>

                  {!vazia && (
                    <div className="scroll-x mt-3">
                      {rotina.routine_exercises.slice(0, 6).map((item) => (
                        <span
                          key={item.id}
                          className="shrink-0 rounded-lg bg-base-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {item.exercise?.name ?? 'Exercício'}
                        </span>
                      ))}
                      {rotina.routine_exercises.length > 6 && (
                        <span className="shrink-0 px-1 py-1 text-xs text-slate-500">
                          +{rotina.routine_exercises.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 border-t border-white/5 p-2">
                  <Botao
                    icone="play"
                    className="flex-1"
                    disabled={vazia}
                    carregando={iniciandoId === rotina.id}
                    onClick={() => void aoIniciar(rotina)}
                  >
                    Iniciar
                  </Botao>
                  <BotaoIcone
                    nome="lapis"
                    rotulo={`Editar ${rotina.name}`}
                    onClick={() => navegar(`/treinos/${rotina.id}`)}
                  />
                  <BotaoIcone
                    nome="copiar"
                    rotulo={`Duplicar ${rotina.name}`}
                    onClick={() => void aoDuplicar(rotina)}
                  />
                  <BotaoIcone
                    nome="lixeira"
                    rotulo={`Excluir ${rotina.name}`}
                    onClick={() => setExcluindo(rotina)}
                    className="hover:bg-danger/15 hover:text-danger"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => abrirEdicao(rotina)}
                  className="w-full border-t border-white/5 px-4 py-2.5 text-left text-xs
                    font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
                >
                  Renomear ou alterar observações
                </button>
              </article>
            )
          })
        )}
      </div>

      {/* Criar / renomear ------------------------------------------------- */}
      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar rotina' : 'Nova rotina'}
        onFechar={() => setModalAberto(false)}
        rodape={
          <div className="flex gap-3">
            <Botao variante="secundario" blocoCompleto onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao blocoCompleto carregando={salvando} onClick={() => void salvar()}>
              {editando ? 'Salvar' : 'Criar'}
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo rotulo="Nome da rotina" erro={erroNome} obrigatorio>
            {(props) => (
              <Entrada
                {...props}
                placeholder="Ex.: Treino A — Peito e Tríceps"
                value={nome}
                temErro={Boolean(erroNome)}
                onChange={(e) => setNome(e.target.value)}
              />
            )}
          </Campo>

          {!editando && (
            <div>
              <p className="titulo-secao">Sugestões</p>
              <div className="flex flex-wrap gap-2">
                {SUGESTOES.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => setNome(sugestao)}
                    className="chip"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Campo rotulo="Observações" ajuda="Opcional. Ex.: foco em cadência lenta.">
            {(props) => (
              <AreaTexto
                {...props}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações sobre esta rotina…"
              />
            )}
          </Campo>
        </div>
      </Modal>

      <Confirmacao
        aberto={excluindo !== null}
        titulo="Excluir rotina"
        mensagem={`"${excluindo?.name}" e seus exercícios configurados serão removidos. O histórico de treinos já executados continua disponível.`}
        textoConfirmar="Excluir"
        perigoso
        onConfirmar={() => void confirmarExclusao()}
        onCancelar={() => setExcluindo(null)}
      />
    </AppShell>
  )
}
