import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { AvisoErro, Botao, Campo, Entrada } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { traduzirErro } from '@/lib/supabase'
import { temErros, validarSenha, type Erros } from '@/lib/validation'

interface Formulario {
  senha: string
  confirmacao: string
}

/**
 * Destino do link de recuperação. O Supabase já troca o token da URL por uma
 * sessão (detectSessionInUrl), então aqui só atualizamos a senha.
 */
export function RedefinirSenha() {
  const { definirNovaSenha, session, carregando } = useAuth()
  const navegar = useNavigate()
  const [form, setForm] = useState<Formulario>({ senha: '', confirmacao: '' })
  const [erros, setErros] = useState<Erros<Formulario>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const validacao: Erros<Formulario> = {
      senha: validarSenha(form.senha),
      confirmacao: form.confirmacao !== form.senha ? 'As senhas não conferem.' : undefined,
    }
    setErros(validacao)
    setErroGeral(null)
    if (temErros(validacao)) return

    setEnviando(true)
    try {
      await definirNovaSenha(form.senha)
      navegar('/', { replace: true })
    } catch (erro) {
      setErroGeral(traduzirErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  if (!carregando && !session) {
    return (
      <AuthLayout
        titulo="Link inválido ou expirado"
        descricao="Peça um novo link de recuperação para criar sua senha."
        rodape={
          <Link
            to="/recuperar-senha"
            className="font-semibold text-lime-400 underline underline-offset-4"
          >
            Pedir novo link
          </Link>
        }
      >
        <AvisoErro mensagem="Não foi possível validar o link de recuperação." />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Criar nova senha" descricao="Escolha uma senha e você já entra direto.">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {erroGeral && <AvisoErro mensagem={erroGeral} />}

        <Campo rotulo="Nova senha" erro={erros.senha} ajuda="Mínimo de 6 caracteres." obrigatorio>
          {(props) => (
            <Entrada
              {...props}
              type="password"
              autoComplete="new-password"
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
              value={form.confirmacao}
              temErro={Boolean(erros.confirmacao)}
              onChange={(e) => setForm({ ...form, confirmacao: e.target.value })}
            />
          )}
        </Campo>

        <Botao type="submit" blocoCompleto carregando={enviando}>
          Salvar nova senha
        </Botao>
      </form>
    </AuthLayout>
  )
}
