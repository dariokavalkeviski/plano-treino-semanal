import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Botao, Campo, Entrada, AvisoErro } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useAuth } from '@/hooks/useAuth'
import { traduzirErro } from '@/lib/supabase'
import { temErros, validarEmail, validarSenha, type Erros } from '@/lib/validation'

interface Formulario {
  email: string
  senha: string
}

export function Login() {
  const { entrar } = useAuth()
  const navegar = useNavigate()
  const [form, setForm] = useState<Formulario>({ email: '', senha: '' })
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const validacao: Erros<Formulario> = {
      email: validarEmail(form.email),
      senha: validarSenha(form.senha),
    }
    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    setEnviando(true)
    try {
      await entrar(form.email, form.senha)
      navegar('/', { replace: true })
    } catch (erro) {
      setErroGeral(traduzirErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Bem-vindo de volta"
      descricao="Entre para registrar o treino de hoje e acompanhar sua evolução."
      rodape={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-lime-400 underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erroGeral && <AvisoErro mensagem={erroGeral} />}

        <Campo rotulo="E-mail" erro={erros.email} obrigatorio>
          {(props) => (
            <Entrada
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={form.email}
              temErro={Boolean(erros.email)}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          )}
        </Campo>

        <Campo rotulo="Senha" erro={erros.senha} obrigatorio>
          {(props) => (
            <div className="relative">
              <Entrada
                {...props}
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={form.senha}
                temErro={Boolean(erros.senha)}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center
                  justify-center rounded-lg text-slate-400 hover:text-slate-200"
              >
                <Icone nome={mostrarSenha ? 'olho_fechado' : 'olho'} tamanho={18} />
              </button>
            </div>
          )}
        </Campo>

        <div className="-mt-1 text-right">
          <Link
            to="/recuperar-senha"
            className="text-sm font-medium text-slate-400 underline underline-offset-4 hover:text-slate-200"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Botao type="submit" blocoCompleto carregando={enviando}>
          Entrar
        </Botao>
      </form>
    </AuthLayout>
  )
}
