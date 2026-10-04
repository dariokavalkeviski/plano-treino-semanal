import { useState } from 'react'
import { AreaTexto, AvisoErro, Botao, Campo, Seletor, cx } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { traduzirErro } from '@/lib/supabase'
import type { DadosExercicioRotina } from '@/hooks/useRoutines'
import type { RoutineExerciseWithExercise } from '@/types/database'

const DESCANSOS = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300]

interface Props {
  item: RoutineExerciseWithExercise
  onSalvar: (dados: Partial<DadosExercicioRotina>) => Promise<void>
  onCancelar: () => void
}

/** Ajusta séries, faixa de repetições e descanso de um exercício da rotina. */
export function EditorExercicioRotina({ item, onSalvar, onCancelar }: Props) {
  const [series, setSeries] = useState(item.target_sets)
  const [repsMin, setRepsMin] = useState(item.target_reps_min)
  const [repsMax, setRepsMax] = useState(item.target_reps_max)
  const [descanso, setDescanso] = useState(item.rest_seconds)
  const [observacoes, setObservacoes] = useState(item.notes ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (repsMax < repsMin) {
      setErro('As repetições máximas não podem ser menores que as mínimas.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar({
        target_sets: series,
        target_reps_min: repsMin,
        target_reps_max: repsMax,
        rest_seconds: descanso,
        notes: observacoes.trim() || null,
      })
    } catch (e) {
      setErro(traduzirErro(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {erro && <AvisoErro mensagem={erro} />}

      <Contador
        rotulo="Séries"
        valor={series}
        min={1}
        max={20}
        onMudar={setSeries}
      />

      <div>
        <p className="label">Repetições alvo</p>
        <div className="flex items-center gap-3">
          <Contador rotulo="Mínimo" compacto valor={repsMin} min={1} max={100} onMudar={setRepsMin} />
          <span className="pt-6 text-slate-500" aria-hidden="true">
            a
          </span>
          <Contador rotulo="Máximo" compacto valor={repsMax} min={1} max={100} onMudar={setRepsMax} />
        </div>
      </div>

      <Campo rotulo="Descanso entre séries">
        {(props) => (
          <Seletor
            {...props}
            value={String(descanso)}
            onChange={(e) => setDescanso(Number(e.target.value))}
          >
            {[...new Set([...DESCANSOS, descanso])]
              .sort((a, b) => a - b)
              .map((segundos) => (
                <option key={segundos} value={segundos}>
                  {segundos >= 60
                    ? `${Math.floor(segundos / 60)}min${segundos % 60 ? ` ${segundos % 60}s` : ''}`
                    : `${segundos}s`}
                </option>
              ))}
          </Seletor>
        )}
      </Campo>

      <Campo rotulo="Observações" ajuda="Opcional. Ex.: pegada supinada, cadência 3-1-1.">
        {(props) => (
          <AreaTexto
            {...props}
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Anotações para a hora do treino…"
          />
        )}
      </Campo>

      <div className="flex gap-3">
        <Botao variante="secundario" blocoCompleto onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao blocoCompleto carregando={salvando} onClick={() => void salvar()}>
          Salvar
        </Botao>
      </div>
    </div>
  )
}

/** Stepper com alvos de toque grandes — usado também na tela de treino. */
export function Contador({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  compacto = false,
  onMudar,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  passo?: number
  compacto?: boolean
  onMudar: (valor: number) => void
}) {
  const limitar = (v: number) => Math.min(max, Math.max(min, v))

  return (
    <div className={compacto ? 'flex-1' : ''}>
      <p className={cx('label', compacto && 'text-xs')}>{rotulo}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMudar(limitar(valor - passo))}
          disabled={valor <= min}
          aria-label={`Diminuir ${rotulo.toLowerCase()}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border
            border-white/10 bg-base-700 text-slate-200 active:scale-95
            disabled:pointer-events-none disabled:opacity-40"
        >
          <Icone nome="menos" tamanho={18} />
        </button>

        <input
          type="number"
          value={valor}
          min={min}
          max={max}
          step={passo}
          aria-label={rotulo}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onMudar(limitar(n))
          }}
          className="input h-12 flex-1 px-2 text-center text-lg font-bold tabular-nums"
        />

        <button
          type="button"
          onClick={() => onMudar(limitar(valor + passo))}
          disabled={valor >= max}
          aria-label={`Aumentar ${rotulo.toLowerCase()}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border
            border-white/10 bg-base-700 text-slate-200 active:scale-95
            disabled:pointer-events-none disabled:opacity-40"
        >
          <Icone nome="mais" tamanho={18} />
        </button>
      </div>
    </div>
  )
}
