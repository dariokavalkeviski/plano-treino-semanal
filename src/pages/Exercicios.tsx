import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import {
  AvisoErro,
  Botao,
  BotaoIcone,
  Confirmacao,
  Esqueleto,
  EstadoVazio,
  Entrada,
  Modal,
  Selo,
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { FormularioExercicio } from '@/components/exercicios/FormularioExercicio'
import { filtrarExercicios, useExercises } from '@/hooks/useExercises'
import { useToast } from '@/hooks/useToast'
import { traduzirErro } from '@/lib/supabase'
import { MUSCLE_GROUPS, muscleGroupLabel, type Exercise, type MuscleGroup } from '@/types/database'

export function Exercicios() {
  const { exercicios, equipamentos, carregando, erro, criar, atualizar, excluir, recarregar } =
    useExercises()
  const toast = useToast()

  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState<MuscleGroup | null>(null)
  const [equipamento, setEquipamento] = useState<string | null>(null)
  const [somenteMeus, setSomenteMeus] = useState(false)
  const [detalhe, setDetalhe] = useState<Exercise | null>(null)
  const [editando, setEditando] = useState<Exercise | null>(null)
  const [criandoNovo, setCriandoNovo] = useState(false)
  const [excluindo, setExcluindo] = useState<Exercise | null>(null)

  const filtrados = useMemo(
    () => filtrarExercicios(exercicios, { busca, grupo, equipamento, somenteMeus }),
    [exercicios, busca, grupo, equipamento, somenteMeus],
  )

  const porGrupo = useMemo(() => {
    const mapa = new Map<MuscleGroup, Exercise[]>()
    for (const ex of filtrados) {
      const lista = mapa.get(ex.muscle_group) ?? []
      lista.push(ex)
      mapa.set(ex.muscle_group, lista)
    }
    return MUSCLE_GROUPS.map((g) => ({ ...g, itens: mapa.get(g.value) ?? [] })).filter(
      (g) => g.itens.length > 0,
    )
  }, [filtrados])

  const temFiltro = Boolean(busca || grupo || equipamento || somenteMeus)

  function limparFiltros() {
    setBusca('')
    setGrupo(null)
    setEquipamento(null)
    setSomenteMeus(false)
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    try {
      await excluir(excluindo.id)
      toast.sucesso('Exercício excluído')
      setExcluindo(null)
      setDetalhe(null)
    } catch (e) {
      toast.erro('Não foi possível excluir', traduzirErro(e))
    }
  }

  return (
    <AppShell
      titulo="Exercícios"
      subtitulo={`${exercicios.length} na biblioteca`}
      acao={
        <BotaoIcone
          nome="mais"
          rotulo="Criar exercício personalizado"
          onClick={() => setCriandoNovo(true)}
          className="bg-lime-400 text-base-900 hover:bg-lime-300 hover:text-base-900"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* Busca --------------------------------------------------------- */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icone nome="busca" tamanho={18} />
          </span>
          <Entrada
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar exercício…"
            aria-label="Buscar exercício"
            className="pl-11"
          />
        </div>

        {/* Filtro por grupo muscular ------------------------------------- */}
        <div>
          <p className="titulo-secao">Grupo muscular</p>
          <div className="scroll-x">
            <button
              type="button"
              onClick={() => setGrupo(null)}
              aria-pressed={grupo === null}
              className={cx('chip shrink-0', grupo === null && 'chip-ativo')}
            >
              Todos
            </button>
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGrupo(grupo === g.value ? null : g.value)}
                aria-pressed={grupo === g.value}
                className={cx('chip shrink-0', grupo === g.value && 'chip-ativo')}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por equipamento ---------------------------------------- */}
        <div>
          <p className="titulo-secao">Equipamento</p>
          <div className="scroll-x">
            <button
              type="button"
              onClick={() => setEquipamento(null)}
              aria-pressed={equipamento === null}
              className={cx('chip shrink-0', equipamento === null && 'chip-ativo')}
            >
              Todos
            </button>
            {equipamentos.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => setEquipamento(equipamento === eq ? null : eq)}
                aria-pressed={equipamento === eq}
                className={cx('chip shrink-0 capitalize', equipamento === eq && 'chip-ativo')}
              >
                {eq}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSomenteMeus((v) => !v)}
              aria-pressed={somenteMeus}
              className={cx('chip shrink-0', somenteMeus && 'chip-ativo')}
            >
              Só os meus
            </button>
          </div>
        </div>

        {temFiltro && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'}
            </span>
            <button
              type="button"
              onClick={limparFiltros}
              className="font-semibold text-lime-400 underline underline-offset-4"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Lista --------------------------------------------------------- */}
        {erro && exercicios.length === 0 ? (
          <AvisoErro mensagem={traduzirErro(erro)} onTentarDeNovo={recarregar} />
        ) : carregando && exercicios.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Esqueleto key={i} className="h-[68px]" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <EstadoVazio
            icone="busca"
            titulo="Nenhum exercício encontrado"
            descricao={
              temFiltro
                ? 'Tente outro termo ou limpe os filtros. Você também pode criar um exercício personalizado.'
                : 'A biblioteca está vazia. Verifique se a migração de exercícios foi aplicada no Supabase.'
            }
            acao={
              temFiltro ? (
                <Botao variante="secundario" blocoCompleto onClick={limparFiltros}>
                  Limpar filtros
                </Botao>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {porGrupo.map((g) => (
              <section key={g.value} aria-labelledby={`grupo-${g.value}`}>
                <h3 id={`grupo-${g.value}`} className="titulo-secao">
                  {g.label} · {g.itens.length}
                </h3>
                <ul className="flex flex-col gap-2">
                  {g.itens.map((ex) => (
                    <li key={ex.id}>
                      <button
                        type="button"
                        onClick={() => setDetalhe(ex)}
                        className="card flex w-full items-center gap-3 p-3.5 text-left
                          transition-colors hover:border-lime-400/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold text-slate-100">
                            <span className="truncate">{ex.name}</span>
                            {ex.user_id && <Selo tom="destaque">Meu</Selo>}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-slate-400">{ex.equipment}</p>
                        </div>
                        <Icone nome="seta_dir" tamanho={18} className="shrink-0 text-slate-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Detalhe do exercício -------------------------------------------- */}
      <Modal
        aberto={detalhe !== null}
        titulo={detalhe?.name ?? ''}
        onFechar={() => setDetalhe(null)}
        rodape={
          detalhe?.user_id ? (
            <div className="flex gap-3">
              <Botao
                variante="secundario"
                blocoCompleto
                icone="lapis"
                onClick={() => {
                  setEditando(detalhe)
                  setDetalhe(null)
                }}
              >
                Editar
              </Botao>
              <Botao variante="perigo" icone="lixeira" onClick={() => setExcluindo(detalhe)}>
                Excluir
              </Botao>
            </div>
          ) : undefined
        }
      >
        {detalhe && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Selo tom="destaque">{muscleGroupLabel(detalhe.muscle_group)}</Selo>
              <Selo>
                <span className="capitalize">{detalhe.equipment}</span>
              </Selo>
              {detalhe.user_id && <Selo tom="ok">Personalizado</Selo>}
            </div>
            <div>
              <h3 className="titulo-secao">Como executar</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {detalhe.instructions || 'Sem instruções cadastradas para este exercício.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Criar / editar --------------------------------------------------- */}
      <Modal
        aberto={criandoNovo || editando !== null}
        titulo={editando ? 'Editar exercício' : 'Novo exercício'}
        onFechar={() => {
          setCriandoNovo(false)
          setEditando(null)
        }}
      >
        <FormularioExercicio
          inicial={editando}
          equipamentosConhecidos={equipamentos}
          onCancelar={() => {
            setCriandoNovo(false)
            setEditando(null)
          }}
          onSalvar={async (dados) => {
            if (editando) {
              await atualizar(editando.id, dados)
              toast.sucesso('Exercício atualizado')
            } else {
              await criar(dados)
              toast.sucesso('Exercício criado', 'Já aparece na sua biblioteca.')
            }
            setCriandoNovo(false)
            setEditando(null)
          }}
        />
      </Modal>

      <Confirmacao
        aberto={excluindo !== null}
        titulo="Excluir exercício"
        mensagem={`"${excluindo?.name}" sai da sua biblioteca. Rotinas que usam este exercício precisam ser ajustadas antes.`}
        textoConfirmar="Excluir"
        perigoso
        onConfirmar={() => void confirmarExclusao()}
        onCancelar={() => setExcluindo(null)}
      />
    </AppShell>
  )
}
