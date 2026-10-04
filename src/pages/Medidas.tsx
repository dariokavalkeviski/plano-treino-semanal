import { useState } from 'react'
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
  cx,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { GraficoMedidas } from '@/components/graficos/Graficos'
import {
  CAMPOS_MEDIDA,
  useMeasurements,
  type CampoMedida,
  type EntradaMedida,
} from '@/hooks/useMeasurements'
import { useToast } from '@/hooks/useToast'
import { traduzirErro } from '@/lib/supabase'
import { formatarData, formatarNumero, hojeISO } from '@/lib/format'
import { paraNumero, temErros, validarNumero, type Erros } from '@/lib/validation'
import type { BodyMeasurement } from '@/types/database'

type Formulario = Record<CampoMedida, string> & { measured_on: string; notes: string }

const LIMITES: Record<CampoMedida, { min: number; max: number }> = {
  weight_kg: { min: 20, max: 400 },
  chest_cm: { min: 30, max: 250 },
  waist_cm: { min: 30, max: 250 },
  arm_cm: { min: 10, max: 120 },
  thigh_cm: { min: 20, max: 150 },
}

function formularioVazio(medida?: BodyMeasurement | null): Formulario {
  return {
    measured_on: medida?.measured_on ?? hojeISO(),
    weight_kg: medida?.weight_kg?.toString() ?? '',
    chest_cm: medida?.chest_cm?.toString() ?? '',
    waist_cm: medida?.waist_cm?.toString() ?? '',
    arm_cm: medida?.arm_cm?.toString() ?? '',
    thigh_cm: medida?.thigh_cm?.toString() ?? '',
    notes: medida?.notes ?? '',
  }
}

export function Medidas() {
  const { medidas, serie, ultima, variacoes, carregando, erro, registrar, excluir, recarregar } =
    useMeasurements()
  const toast = useToast()

  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<Formulario>(() => formularioVazio())
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [campoGrafico, setCampoGrafico] = useState<CampoMedida>('weight_kg')
  const [excluindo, setExcluindo] = useState<BodyMeasurement | null>(null)

  function abrir(medida?: BodyMeasurement | null) {
    setForm(formularioVazio(medida))
    setErros({})
    setErroGeral(null)
    setModalAberto(true)
  }

  async function salvar() {
    const validacao: Erros<Formulario> = {}
    for (const { campo, rotulo } of CAMPOS_MEDIDA) {
      const limite = LIMITES[campo]
      validacao[campo] = validarNumero(form[campo], { ...limite, rotulo })
    }
    if (!form.measured_on) validacao.measured_on = 'Informe a data da medição.'
    else if (form.measured_on > hojeISO()) validacao.measured_on = 'A data não pode ser no futuro.'

    const algumValor = CAMPOS_MEDIDA.some(({ campo }) => form[campo].trim() !== '')
    if (!algumValor) validacao.weight_kg = 'Preencha pelo menos uma medida.'

    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    const entrada: EntradaMedida = {
      measured_on: form.measured_on,
      weight_kg: paraNumero(form.weight_kg),
      chest_cm: paraNumero(form.chest_cm),
      waist_cm: paraNumero(form.waist_cm),
      arm_cm: paraNumero(form.arm_cm),
      thigh_cm: paraNumero(form.thigh_cm),
      notes: form.notes.trim() || null,
    }

    setSalvando(true)
    try {
      await registrar(entrada)
      setModalAberto(false)
      toast.sucesso('Medição registrada')
    } catch (e) {
      setErroGeral(traduzirErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    try {
      await excluir(excluindo.id)
      setExcluindo(null)
      toast.sucesso('Medição excluída')
    } catch (e) {
      toast.erro('Não foi possível excluir', traduzirErro(e))
    }
  }

  const campoAtual = CAMPOS_MEDIDA.find((c) => c.campo === campoGrafico)!

  return (
    <AppShell
      comVoltar
      titulo="Medidas corporais"
      subtitulo={ultima ? `Última: ${formatarData(ultima.measured_on)}` : undefined}
      acao={
        <BotaoIcone
          nome="mais"
          rotulo="Registrar medição"
          onClick={() => abrir()}
          className="bg-lime-400 text-base-900 hover:bg-lime-300 hover:text-base-900"
        />
      }
    >
      <div className="flex flex-col gap-5">
        {erro && medidas.length === 0 ? (
          <AvisoErro mensagem={traduzirErro(erro)} onTentarDeNovo={recarregar} />
        ) : carregando && medidas.length === 0 ? (
          <>
            <Esqueleto className="h-32" />
            <Esqueleto className="h-52" />
          </>
        ) : medidas.length === 0 ? (
          <EstadoVazio
            icone="regua"
            titulo="Registre suas medidas"
            descricao="Acompanhe peso, peito, cintura, braço e coxa ao longo do tempo. Uma medição a cada 2 ou 4 semanas já mostra bem a evolução."
            acao={
              <Botao blocoCompleto icone="mais" onClick={() => abrir()}>
                Registrar primeira medição
              </Botao>
            }
          />
        ) : (
          <>
            {/* Última medição + variação ------------------------------- */}
            {ultima && (
              <section aria-labelledby="t-atual">
                <h2 id="t-atual" className="titulo-secao">
                  Medidas atuais
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {CAMPOS_MEDIDA.map(({ campo, rotulo, unidade }) => {
                    const valor = ultima[campo]
                    const variacao = variacoes[campo]
                    // Na cintura, reduzir é o resultado desejado.
                    const bomSeCair = campo === 'waist_cm'
                    const positivo =
                      variacao === undefined
                        ? null
                        : bomSeCair
                          ? variacao < 0
                          : variacao > 0

                    return (
                      <div key={campo} className="card p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {rotulo}
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-100">
                          {valor === null ? (
                            <span className="text-base font-medium text-slate-500">—</span>
                          ) : (
                            <>
                              {formatarNumero(Number(valor), 1)}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                {unidade}
                              </span>
                            </>
                          )}
                        </p>
                        {variacao !== undefined && variacao !== 0 && (
                          <p
                            className={cx(
                              'mt-1 flex items-center gap-1 text-xs font-semibold',
                              positivo ? 'text-ok' : 'text-warn',
                            )}
                          >
                            <Icone
                              nome={variacao > 0 ? 'seta_cima' : 'seta_baixo'}
                              tamanho={12}
                            />
                            {variacao > 0 ? '+' : ''}
                            {formatarNumero(variacao, 1)} {unidade}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Gráfico ------------------------------------------------- */}
            <section aria-labelledby="t-grafico">
              <h2 id="t-grafico" className="titulo-secao">
                Evolução
              </h2>
              <div className="scroll-x mb-3">
                {CAMPOS_MEDIDA.map(({ campo, rotulo }) => (
                  <button
                    key={campo}
                    type="button"
                    onClick={() => setCampoGrafico(campo)}
                    aria-pressed={campoGrafico === campo}
                    className={cx('chip shrink-0', campoGrafico === campo && 'chip-ativo')}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              <GraficoMedidas
                medidas={serie}
                campo={campoAtual.campo}
                rotulo={campoAtual.rotulo}
                unidade={campoAtual.unidade}
              />
            </section>

            {/* Histórico ---------------------------------------------- */}
            <section aria-labelledby="t-hist-medidas">
              <h2 id="t-hist-medidas" className="titulo-secao">
                Histórico · {medidas.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {medidas.map((medida) => (
                  <li key={medida.id} className="card p-3.5">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-semibold text-slate-100">
                        {formatarData(medida.measured_on)}
                      </p>
                      <BotaoIcone
                        nome="lapis"
                        rotulo={`Editar medição de ${formatarData(medida.measured_on)}`}
                        tamanho={16}
                        onClick={() => abrir(medida)}
                        className="h-9 w-9"
                      />
                      <BotaoIcone
                        nome="lixeira"
                        rotulo={`Excluir medição de ${formatarData(medida.measured_on)}`}
                        tamanho={16}
                        onClick={() => setExcluindo(medida)}
                        className="h-9 w-9 hover:bg-danger/15 hover:text-danger"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {CAMPOS_MEDIDA.map(({ campo, rotulo, unidade }) =>
                        medida[campo] === null ? null : (
                          <Selo key={campo}>
                            {rotulo}: {formatarNumero(Number(medida[campo]), 1)} {unidade}
                          </Selo>
                        ),
                      )}
                    </div>
                    {medida.notes && (
                      <p className="mt-2 text-xs italic text-slate-400">{medida.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {/* Registrar / editar ---------------------------------------------- */}
      <Modal
        aberto={modalAberto}
        titulo="Registrar medição"
        onFechar={() => setModalAberto(false)}
        rodape={
          <div className="flex gap-3">
            <Botao variante="secundario" blocoCompleto onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao blocoCompleto carregando={salvando} onClick={() => void salvar()}>
              Salvar
            </Botao>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <AvisoErro mensagem={erroGeral} />}

          <Campo rotulo="Data da medição" erro={erros.measured_on} obrigatorio>
            {(props) => (
              <Entrada
                {...props}
                type="date"
                max={hojeISO()}
                value={form.measured_on}
                temErro={Boolean(erros.measured_on)}
                onChange={(e) => setForm({ ...form, measured_on: e.target.value })}
              />
            )}
          </Campo>

          <p className="text-xs text-slate-400">
            Preencha o que você mediu — campos em branco são ignorados.
          </p>

          {CAMPOS_MEDIDA.map(({ campo, rotulo, unidade }) => (
            <Campo key={campo} rotulo={`${rotulo} (${unidade})`} erro={erros[campo]}>
              {(props) => (
                <Entrada
                  {...props}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder={campo === 'weight_kg' ? 'Ex.: 78,5' : 'Ex.: 95'}
                  value={form[campo]}
                  temErro={Boolean(erros[campo])}
                  onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                />
              )}
            </Campo>
          ))}

          <Campo rotulo="Observações" ajuda="Opcional. Ex.: medido em jejum, pela manhã.">
            {(props) => (
              <AreaTexto
                {...props}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </Campo>
        </div>
      </Modal>

      <Confirmacao
        aberto={excluindo !== null}
        titulo="Excluir medição"
        mensagem={`A medição de ${excluindo ? formatarData(excluindo.measured_on) : ''} será removida.`}
        textoConfirmar="Excluir"
        perigoso
        onConfirmar={() => void confirmarExclusao()}
        onCancelar={() => setExcluindo(null)}
      />
    </AppShell>
  )
}
