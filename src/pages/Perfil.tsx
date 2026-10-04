import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  AvisoErro,
  Botao,
  Campo,
  Confirmacao,
  Entrada,
  Esqueleto,
  Selo,
  Seletor,
} from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useHistory } from '@/hooks/useHistory'
import { useToast } from '@/hooks/useToast'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { sincronizar } from '@/lib/outbox'
import { traduzirErro } from '@/lib/supabase'
import { calcularIMC, classificarIMC, formatarNumero, formatarVolume } from '@/lib/format'
import { paraNumero, temErros, validarNome, validarNumero, type Erros } from '@/lib/validation'
import { GOALS, type Goal } from '@/types/database'

interface Formulario {
  name: string
  weight_kg: string
  height_cm: string
  goal: Goal | ''
}

export function Perfil() {
  const { user, sair } = useAuth()
  const { profile, carregando, atualizar } = useProfile()
  const { totais, sequencia } = useHistory()
  const { online, naFila } = useOnlineStatus()
  const toast = useToast()
  const navegar = useNavigate()

  const [form, setForm] = useState<Formulario>({
    name: '',
    weight_kg: '',
    height_cm: '',
    goal: '',
  })
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [sincronizandoAgora, setSincronizandoAgora] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name ?? '',
      weight_kg: profile.weight_kg?.toString() ?? '',
      height_cm: profile.height_cm?.toString() ?? '',
      goal: profile.goal ?? '',
    })
  }, [profile])

  async function salvar() {
    const validacao: Erros<Formulario> = {
      name: validarNome(form.name),
      weight_kg: validarNumero(form.weight_kg, { min: 20, max: 400, rotulo: 'Peso' }),
      height_cm: validarNumero(form.height_cm, { min: 90, max: 260, rotulo: 'Altura' }),
    }
    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    setSalvando(true)
    try {
      await atualizar({
        name: form.name.trim(),
        weight_kg: paraNumero(form.weight_kg),
        height_cm: paraNumero(form.height_cm),
        goal: form.goal === '' ? null : form.goal,
      })
      toast.sucesso('Perfil salvo')
    } catch (e) {
      setErroGeral(traduzirErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function aoSair() {
    try {
      await sair()
      navegar('/login', { replace: true })
    } catch (e) {
      toast.erro('Não foi possível sair', traduzirErro(e))
    }
  }

  async function forcarSincronizacao() {
    setSincronizandoAgora(true)
    try {
      const { enviados, restantes } = await sincronizar()
      if (enviados > 0) {
        toast.sucesso(
          `${enviados} ${enviados === 1 ? 'alteração enviada' : 'alterações enviadas'}`,
          restantes > 0 ? `${restantes} ainda pendentes.` : undefined,
        )
      } else {
        toast.info('Nada para enviar')
      }
    } finally {
      setSincronizandoAgora(false)
    }
  }

  const peso = paraNumero(form.weight_kg)
  const altura = paraNumero(form.height_cm)
  const imc = peso && altura ? calcularIMC(peso, altura) : null
  const classificacao = imc ? classificarIMC(imc) : null

  return (
    <AppShell titulo="Perfil">
      <div className="flex flex-col gap-5">
        {/* Identificação ------------------------------------------------ */}
        <div className="card flex items-center gap-4 p-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl
              bg-lime-400/15 text-xl font-bold text-lime-400"
            aria-hidden="true"
          >
            {(profile?.name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {carregando && !profile ? (
              <Esqueleto className="h-10" />
            ) : (
              <>
                <p className="truncate font-bold text-slate-100">
                  {profile?.name || 'Sem nome definido'}
                </p>
                <p className="truncate text-sm text-slate-400">{user?.email}</p>
              </>
            )}
          </div>
        </div>

        {/* Números ------------------------------------------------------ */}
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-slate-100">{totais.treinos}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Treinos</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-slate-100">{sequencia}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Sequência</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-slate-100">
              {formatarVolume(totais.volume)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Volume</p>
          </div>
        </div>

        {/* Dados pessoais ---------------------------------------------- */}
        <section aria-labelledby="t-dados" className="card p-4">
          <h2 id="t-dados" className="titulo-secao">
            Seus dados
          </h2>
          <div className="flex flex-col gap-4">
            {erroGeral && <AvisoErro mensagem={erroGeral} />}

            <Campo rotulo="Nome" erro={erros.name} obrigatorio>
              {(props) => (
                <Entrada
                  {...props}
                  autoComplete="name"
                  value={form.name}
                  temErro={Boolean(erros.name)}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              )}
            </Campo>

            <div className="flex gap-3">
              <div className="flex-1">
                <Campo rotulo="Peso (kg)" erro={erros.weight_kg}>
                  {(props) => (
                    <Entrada
                      {...props}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="78,5"
                      value={form.weight_kg}
                      temErro={Boolean(erros.weight_kg)}
                      onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                    />
                  )}
                </Campo>
              </div>
              <div className="flex-1">
                <Campo rotulo="Altura (cm)" erro={erros.height_cm}>
                  {(props) => (
                    <Entrada
                      {...props}
                      type="number"
                      inputMode="numeric"
                      step="1"
                      placeholder="178"
                      value={form.height_cm}
                      temErro={Boolean(erros.height_cm)}
                      onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                    />
                  )}
                </Campo>
              </div>
            </div>

            {imc && classificacao && (
              <div className="flex items-center gap-3 rounded-xl bg-base-700 p-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">IMC</p>
                  <p className="text-xl font-bold tabular-nums text-slate-100">
                    {formatarNumero(imc, 1)}
                  </p>
                </div>
                <p className={`ml-auto text-sm font-semibold ${classificacao.cor}`}>
                  {classificacao.rotulo}
                </p>
              </div>
            )}

            <Campo rotulo="Objetivo">
              {(props) => (
                <Seletor
                  {...props}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value as Goal | '' })}
                >
                  <option value="">Não definido</option>
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Seletor>
              )}
            </Campo>

            <Botao blocoCompleto carregando={salvando} onClick={() => void salvar()}>
              Salvar alterações
            </Botao>
          </div>
        </section>

        {/* Atalhos ------------------------------------------------------ */}
        <section aria-labelledby="t-atalhos">
          <h2 id="t-atalhos" className="titulo-secao">
            Mais
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/medidas"
              className="card flex items-center gap-3 p-4 transition-colors hover:border-lime-400/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-700 text-lime-400">
                <Icone nome="regua" tamanho={18} />
              </span>
              <span className="flex-1 font-semibold text-slate-100">Medidas corporais</span>
              <Icone nome="seta_dir" className="shrink-0 text-slate-500" />
            </Link>

            <div className="card flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-700 text-lime-400">
                <Icone nome={online ? 'sincronizar' : 'nuvem_off'} tamanho={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100">Sincronização</p>
                <p className="text-xs text-slate-400">
                  {!online
                    ? 'Sem conexão'
                    : naFila === 0
                      ? 'Tudo sincronizado'
                      : `${naFila} ${naFila === 1 ? 'alteração pendente' : 'alterações pendentes'}`}
                </p>
              </div>
              {naFila > 0 && online && (
                <Botao
                  variante="secundario"
                  carregando={sincronizandoAgora}
                  onClick={() => void forcarSincronizacao()}
                  className="min-h-[40px] px-3 text-sm"
                >
                  Enviar
                </Botao>
              )}
              {naFila === 0 && online && <Selo tom="ok">OK</Selo>}
            </div>
          </div>
        </section>

        <Botao
          variante="perigo"
          blocoCompleto
          icone="sair"
          onClick={() => setConfirmarSaida(true)}
        >
          Sair da conta
        </Botao>

        <p className="pb-2 text-center text-xs text-slate-600">FitTrack · versão 1.0</p>
      </div>

      <Confirmacao
        aberto={confirmarSaida}
        titulo="Sair da conta"
        mensagem={
          naFila > 0
            ? `Você tem ${naFila} ${naFila === 1 ? 'alteração' : 'alterações'} ainda não enviadas. Envie antes de sair para não perder nada.`
            : 'Você precisará entrar novamente para registrar treinos.'
        }
        textoConfirmar="Sair"
        perigoso
        onConfirmar={() => void aoSair()}
        onCancelar={() => setConfirmarSaida(false)}
      />
    </AppShell>
  )
}
