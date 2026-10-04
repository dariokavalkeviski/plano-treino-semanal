import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { AvisoErro, Botao, Campo, Entrada } from '@/components/ui'
import { Icone } from '@/components/ui/Icone'
import { useAuth } from '@/hooks/useAuth'
import { traduzirErro } from '@/lib/supabase'
import { validarEmail } from '@/lib/validation'

export function RecuperarSenha() {
  const { recuperarSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const validacao = validarEmail(email)
    setErro(validacao)
    setErroGeral(null)
    if (validacao) return

    setEnviando(true)
    try {
      await recuperarSenha(email)
      setEnviado(true)
    } catch (e) {
      setErroGeral(traduzirErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <AuthLayout
        titulo="Verifique seu e-mail"
        descricao="Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha."
        rodape={
          <Link to="/login" className="font-semibold text-lime-400 underline underline-offset-4">
            Voltar ao login
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
            <Icone nome="email" tamanho={26} />
          </div>
          <p className="text-sm text-slate-300">
            Enviado para <strong className="text-slate-100">{email}</strong>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Recuperar senha"
      descricao="Informe seu e-mail e enviamos um link para você criar uma nova senha."
      rodape={
        <Link to="/login" className="font-semibold text-lime-400 underline underline-offset-4">
          Voltar ao login
        </Link>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erroGeral && <AvisoErro mensagem={erroGeral} />}

        <Campo rotulo="E-mail" erro={erro} obrigatorio>
          {(props) => (
            <Entrada
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              temErro={Boolean(erro)}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Campo>

        <Botao type="submit" blocoCompleto carregando={enviando}>
          Enviar link
        </Botao>
      </form>
    </AuthLayout>
  )
}
