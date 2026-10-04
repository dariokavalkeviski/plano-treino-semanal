import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { AvisoErro, Botao, Campo, Entrada } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useAuth } from '@/hooks/useAuth'
import { traduzirErro } from '@/lib/supabase'
import {
  temErros,
  validarEmail,
  validarNome,
  validarSenha,
  type Erros,
} from '@/lib/validation'

interface Formulario {
  nome: string
  email: string
  senha: string
  confirmacao: string
}

export function Cadastro() {
  const { cadastrar } = useAuth()
  const navegar = useNavigate()
  const [form, setForm] = useState<Formulario>({
    nome: '',
    email: '',
    senha: '',
    confirmacao: '',
  })
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmacaoEnviada, setConfirmacaoEnviada] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const validacao: Erros<Formulario> = {
      nome: validarNome(form.nome),
      email: validarEmail(form.email),
      senha: validarSenha(form.senha),
      confirmacao:
        form.confirmacao !== form.senha ? 'As senhas não conferem.' : undefined,
    }
    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    setEnviando(true)
    try {
      const { precisaConfirmar } = await cadastrar(form.nome, form.email, form.senha)
      if (precisaConfirmar) setConfirmacaoEnviada(true)
      else navegar('/', { replace: true })
    } catch (erro) {
      setErroGeral(traduzirErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  if (confirmacaoEnviada) {
    return (
      <AuthLayout
        titulo="Confirme seu e-mail"
        descricao="Enviamos um link de confirmação. Abra o e-mail para ativar sua conta e depois faça login."
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
            <Icone nome="email" tamanho={26} />
          </div>
          <p className="text-sm text-slate-300">
            Link enviado para <strong className="text-slate-100">{form.email}</strong>
          </p>
          <Botao blocoCompleto onClick={() => navegar('/login')}>
            Ir para o login
          </Botao>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Criar conta"
      descricao="Leva menos de um minuto. Depois é só montar sua rotina e treinar."
      rodape={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-lime-400 underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erroGeral && <AvisoErro mensagem={erroGeral} />}

        <Campo rotulo="Nome" erro={erros.nome} obrigatorio>
          {(props) => (
            <Entrada
              {...props}
              autoComplete="name"
              placeholder="Como quer ser chamado"
              value={form.nome}
              temErro={Boolean(erros.nome)}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          )}
        </Campo>

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

        <Campo
          rotulo="Senha"
          erro={erros.senha}
          ajuda="Mínimo de 6 caracteres."
          obrigatorio
        >
          {(props) => (
            <Entrada
              {...props}
              type="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              value={form.senha}
              temErro={Boolean(erros.senha)}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          )}
        </Campo>

        <Campo rotulo="Confirmar senha" erro={erros.confirmacao} obrigatorio>
          {(props) => (
            <Entrada
              {...props}
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={form.confirmacao}
              temErro={Boolean(erros.confirmacao)}
              onChange={(e) => setForm({ ...form, confirmacao: e.target.value })}
            />
          )}
        </Campo>

        <Botao type="submit" blocoCompleto carregando={enviando}>
          Criar conta
        </Botao>
      </form>
    </AuthLayout>
  )
}
