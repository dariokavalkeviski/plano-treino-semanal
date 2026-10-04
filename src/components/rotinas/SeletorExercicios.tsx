import { useMemo, useState } from 'react'
import { Botao, Entrada, EstadoVazio, Selo, cx } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { filtrarExercicios } from '@/hooks/useExercises'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/types/database'

interface Props {
  exercicios: Exercise[]
  jaNaRotina: Set<string>
  onConfirmar: (ids: string[]) => Promise<void> | void
  onCancelar: () => void
}

/** Escolha múltipla de exercícios para adicionar a uma rotina. */
export function SeletorExercicios({ exercicios, jaNaRotina, onConfirmar, onCancelar }: Props) {
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState<MuscleGroup | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  const filtrados = useMemo(
    () => filtrarExercicios(exercicios, { busca, grupo }),
    [exercicios, busca, grupo],
  )

  function alternar(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id],
    )
  }

  async function confirmar() {
    if (selecionados.length === 0) return
    setEnviando(true)
    try {
      await onConfirmar(selecionados)
      setSelecionados([])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
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

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone="busca"
          titulo="Nada encontrado"
          descricao="Tente outro termo ou troque o grupo muscular."
        />
      ) : (
        <ul className="-mx-1 flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto px-1">
          {filtrados.map((ex) => {
            const marcado = selecionados.includes(ex.id)
            const repetido = jaNaRotina.has(ex.id)
            return (
              <li key={ex.id}>
                <label
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                    marcado
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-white/5 bg-base-700 hover:border-white/15',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(ex.id)}
                    className="h-5 w-5 shrink-0 rounded border-white/20 bg-base-600
                      text-lime-400 focus:ring-lime-400"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-100">{ex.name}</span>
                      {repetido && <Selo tom="alerta">Já na rotina</Selo>}
                    </span>
                    <span className="mt-0.5 block text-xs capitalize text-slate-400">
                      {ex.equipment}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex gap-3">
        <Botao variante="secundario" blocoCompleto onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          blocoCompleto
          disabled={selecionados.length === 0}
          carregando={enviando}
          onClick={() => void confirmar()}
        >
          {selecionados.length === 0
            ? 'Adicionar'
            : `Adicionar ${selecionados.length}`}
        </Botao>
      </div>
    </div>
  )
}
