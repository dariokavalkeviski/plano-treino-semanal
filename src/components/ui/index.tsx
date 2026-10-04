import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Icone, type NomeIcone } from './Icone'

export function cx(...partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(' ')
}

/* -------------------------------------------------------------------------- */
/* Botão                                                                      */
/* -------------------------------------------------------------------------- */

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  carregando?: boolean
  icone?: NomeIcone
  blocoCompleto?: boolean
}

const classesVariante: Record<Variante, string> = {
  primario: 'btn-primario',
  secundario: 'btn-secundario',
  fantasma: 'btn-fantasma',
  perigo: 'btn-perigo',
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = 'primario', carregando, icone, blocoCompleto, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      {...props}
      disabled={props.disabled || carregando}
      aria-busy={carregando || undefined}
      className={cx(classesVariante[variante], blocoCompleto && 'w-full', className)}
    >
      {carregando ? <Spinner tamanho={18} /> : icone ? <Icone nome={icone} /> : null}
      {children}
    </button>
  )
})

/** Botão redondo só com ícone — precisa de rótulo acessível. */
interface BotaoIconeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  nome: NomeIcone
  rotulo: string
  tamanho?: number
}

export function BotaoIcone({ nome, rotulo, tamanho = 20, className, ...props }: BotaoIconeProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      {...props}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        'text-slate-300 transition-colors hover:bg-white/5 hover:text-slate-100',
        'active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <Icone nome={nome} tamanho={tamanho} />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Campos de formulário                                                      */
/* -------------------------------------------------------------------------- */

interface CampoProps {
  rotulo: string
  erro?: string | undefined
  ajuda?: string
  obrigatorio?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode
}

/** Envolve um campo com rótulo, texto de ajuda e mensagem de erro ligados por id. */
export function Campo({ rotulo, erro, ajuda, obrigatorio, children }: CampoProps) {
  const id = useId()
  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descritores = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id} className="label">
        {rotulo}
        {obrigatorio && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        ...(descritores ? { 'aria-describedby': descritores } : {}),
        ...(erro ? { 'aria-invalid': true as const } : {}),
      })}
      {ajuda && !erro && (
        <p id={idAjuda} className="mt-1.5 text-sm text-slate-400">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} role="alert" className="erro-campo">
          <Icone nome="alerta" tamanho={16} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  )
}

interface EntradaProps extends InputHTMLAttributes<HTMLInputElement> {
  temErro?: boolean
}

export const Entrada = forwardRef<HTMLInputElement, EntradaProps>(function Entrada(
  { temErro, className, ...props },
  ref,
) {
  return (
    <input ref={ref} {...props} className={cx('input', temErro && 'input-erro', className)} />
  )
})

interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  temErro?: boolean
}

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { temErro, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={props.rows ?? 3}
      {...props}
      className={cx('input resize-y', temErro && 'input-erro', className)}
    />
  )
})

interface SeletorProps extends SelectHTMLAttributes<HTMLSelectElement> {
  temErro?: boolean
}

export const Seletor = forwardRef<HTMLSelectElement, SeletorProps>(function Seletor(
  { temErro, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      {...props}
      className={cx('input appearance-none pr-10', temErro && 'input-erro', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.85rem center',
      }}
    >
      {children}
    </select>
  )
})

/* -------------------------------------------------------------------------- */
/* Estados: carregando, vazio, erro                                          */
/* -------------------------------------------------------------------------- */

export function Spinner({ tamanho = 24, className }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      className={cx('animate-spin', className)}
      role="img"
      aria-label="Carregando"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" fill="none" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function TelaCarregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Spinner tamanho={32} className="text-lime-400" />
      <p className="text-sm">{texto}</p>
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-xl bg-base-700', className)} />
}

interface EstadoVazioProps {
  icone?: NomeIcone
  titulo: string
  descricao: string
  acao?: ReactNode
}

export function EstadoVazio({ icone = 'halter', titulo, descricao, acao }: EstadoVazioProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
        <Icone nome={icone} tamanho={30} />
      </div>
      <h3 className="text-lg font-bold text-slate-100">{titulo}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-slate-400">{descricao}</p>
      {acao && <div className="mt-2 w-full max-w-xs">{acao}</div>}
    </div>
  )
}

export function AvisoErro({ mensagem, onTentarDeNovo }: { mensagem: string; onTentarDeNovo?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4"
    >
      <Icone nome="alerta" className="mt-0.5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-sm text-slate-100">{mensagem}</p>
        {onTentarDeNovo && (
          <button
            type="button"
            onClick={onTentarDeNovo}
            className="mt-2 text-sm font-semibold text-lime-400 underline underline-offset-2"
          >
            Tentar de novo
          </button>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal (bottom sheet no celular)                                           */
/* -------------------------------------------------------------------------- */

interface ModalProps {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}

export function Modal({ aberto, titulo, onFechar, children, rodape }: ModalProps) {
  const painel = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    painel.current?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onFechar}
        aria-hidden="true"
      />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-2xl border
          border-white/10 bg-base-800 shadow-2xl animate-slide-up
          sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
          <h2 id={tituloId} className="text-lg font-bold text-slate-100">
            {titulo}
          </h2>
          <BotaoIcone nome="fechar" rotulo="Fechar" onClick={onFechar} className="-mr-2" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && (
          <div className="border-t border-white/5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmacaoProps {
  aberto: boolean
  titulo: string
  mensagem: string
  textoConfirmar?: string
  perigoso?: boolean
  onConfirmar: () => void
  onCancelar: () => void
  carregando?: boolean
}

export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  perigoso = false,
  onConfirmar,
  onCancelar,
  carregando,
}: ConfirmacaoProps) {
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      onFechar={onCancelar}
      rodape={
        <div className="flex gap-3">
          <Botao variante="secundario" blocoCompleto onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao
            variante={perigoso ? 'perigo' : 'primario'}
            blocoCompleto
            onClick={onConfirmar}
            carregando={carregando}
          >
            {textoConfirmar}
          </Botao>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-300">{mensagem}</p>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Diversos                                                                   */
/* -------------------------------------------------------------------------- */

export function Selo({
  children,
  tom = 'neutro',
}: {
  children: ReactNode
  tom?: 'neutro' | 'destaque' | 'alerta' | 'ok' | 'perigo'
}) {
  const tons = {
    neutro: 'bg-white/5 text-slate-300',
    destaque: 'bg-lime-400/15 text-lime-300',
    alerta: 'bg-warn/15 text-warn',
    ok: 'bg-ok/15 text-ok',
    perigo: 'bg-danger/15 text-danger',
  }
  return <span className={cx('selo', tons[tom])}>{children}</span>
}

export function Estatistica({
  rotulo,
  valor,
  sufixo,
  icone,
}: {
  rotulo: string
  valor: string | number
  sufixo?: string
  icone?: NomeIcone
}) {
  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">
        {icone && <Icone nome={icone} tamanho={14} />}
        <span className="text-xs font-medium uppercase tracking-wide">{rotulo}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-100">
        {valor}
        {sufixo && <span className="ml-1 text-sm font-medium text-slate-400">{sufixo}</span>}
      </p>
    </div>
  )
}

export function BarraProgresso({ percentual, rotulo }: { percentual: number; rotulo?: string }) {
  const valor = Math.min(100, Math.max(0, percentual))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(valor)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo ?? 'Progresso'}
      className="h-2 w-full overflow-hidden rounded-full bg-base-600"
    >
      <div
        className="h-full rounded-full bg-lime-400 transition-[width] duration-300"
        style={{ width: `${valor}%` }}
      />
    </div>
  )
}
