import { useState } from 'react'
import { AreaTexto, AvisoErro, Botao, Campo, Entrada, Seletor } from '@/components/ui'
import { traduzirErro } from '@/lib/supabase'
import { temErros, validarTexto, type Erros } from '@/lib/validation'
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/types/database'
import type { NovoExercicio } from '@/hooks/useExercises'

const EQUIPAMENTOS_PADRAO = [
  'barra',
  'halteres',
  'polia',
  'máquina',
  'peso do corpo',
  'barra fixa',
  'smith',
  'anilha',
  'kettlebell',
  'elástico',
]

interface Props {
  inicial?: Exercise | null
  equipamentosConhecidos?: string[]
  onSalvar: (dados: NovoExercicio) => Promise<void>
  onCancelar: () => void
}

interface Formulario {
  name: string
  muscle_group: MuscleGroup
  equipment: string
  instructions: string
}

export function FormularioExercicio({
  inicial,
  equipamentosConhecidos = [],
  onSalvar,
  onCancelar,
}: Props) {
  const [form, setForm] = useState<Formulario>({
    name: inicial?.name ?? '',
    muscle_group: inicial?.muscle_group ?? 'peito',
    equipment: inicial?.equipment ?? 'halteres',
    instructions: inicial?.instructions ?? '',
  })
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const opcoesEquipamento = [
    ...new Set([...EQUIPAMENTOS_PADRAO, ...equipamentosConhecidos, form.equipment]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const validacao: Erros<Formulario> = {
      name: validarTexto(form.name, { min: 2, max: 80, rotulo: 'Nome' }),
      equipment: validarTexto(form.equipment, { min: 2, max: 40, rotulo: 'Equipamento' }),
      instructions: validarTexto(form.instructions, {
        obrigatorio: false,
        max: 600,
        rotulo: 'Instruções',
      }),
    }
    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    setEnviando(true)
    try {
      await onSalvar({
        name: form.name.trim(),
        muscle_group: form.muscle_group,
        equipment: form.equipment.trim(),
        instructions: form.instructions.trim() || null,
      })
    } catch (e) {
      setErroGeral(traduzirErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {erroGeral && <AvisoErro mensagem={erroGeral} />}

      <Campo rotulo="Nome do exercício" erro={erros.name} obrigatorio>
        {(props) => (
          <Entrada
            {...props}
            placeholder="Ex.: Supino inclinado com halteres"
            value={form.name}
            temErro={Boolean(erros.name)}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}
      </Campo>

      <Campo rotulo="Grupo muscular" obrigatorio>
        {(props) => (
          <Seletor
            {...props}
            value={form.muscle_group}
            onChange={(e) => setForm({ ...form, muscle_group: e.target.value as MuscleGroup })}
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Seletor>
        )}
      </Campo>

      <Campo rotulo="Equipamento" erro={erros.equipment} obrigatorio>
        {(props) => (
          <Seletor
            {...props}
            value={form.equipment}
            temErro={Boolean(erros.equipment)}
            onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            className="capitalize"
          >
            {opcoesEquipamento.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </Seletor>
        )}
      </Campo>

      <Campo
        rotulo="Instruções"
        erro={erros.instructions}
        ajuda="Opcional. Uma orientação curta de execução ajuda na hora do treino."
      >
        {(props) => (
          <AreaTexto
            {...props}
            rows={4}
            placeholder="Como executar o movimento…"
            value={form.instructions}
            temErro={Boolean(erros.instructions)}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        )}
      </Campo>

      <div className="flex gap-3 pt-1">
        <Botao variante="secundario" blocoCompleto onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" blocoCompleto carregando={enviando}>
          Salvar
        </Botao>
      </div>
    </form>
  )
}
