import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { novoId } from '@/lib/storage'

export type TipoToast = 'sucesso' | 'erro' | 'info' | 'recorde'

export interface Toast {
  id: string
  tipo: TipoToast
  titulo: string
  descricao?: string
}

interface ContextoToast {
  toasts: Toast[]
  mostrar: (toast: Omit<Toast, 'id'>, duracaoMs?: number) => void
  sucesso: (titulo: string, descricao?: string) => void
  erro: (titulo: string, descricao?: string) => void
  info: (titulo: string, descricao?: string) => void
  recorde: (titulo: string, descricao?: string) => void
  fechar: (id: string) => void
}

const Contexto = createContext<ContextoToast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const fechar = useCallback((id: string) => {
    setToasts((atual) => atual.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const mostrar = useCallback(
    (toast: Omit<Toast, 'id'>, duracaoMs = 4000) => {
      const id = novoId()
      setToasts((atual) => [...atual.slice(-2), { ...toast, id }])
      timers.current.set(
        id,
        setTimeout(() => fechar(id), duracaoMs),
      )
    },
    [fechar],
  )

  const valor = useMemo<ContextoToast>(
    () => ({
      toasts,
      mostrar,
      fechar,
      sucesso: (titulo, descricao) => mostrar({ tipo: 'sucesso', titulo, descricao }),
      erro: (titulo, descricao) => mostrar({ tipo: 'erro', titulo, descricao }, 6000),
      info: (titulo, descricao) => mostrar({ tipo: 'info', titulo, descricao }),
      recorde: (titulo, descricao) => mostrar({ tipo: 'recorde', titulo, descricao }, 5000),
    }),
    [toasts, mostrar, fechar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  return contexto
}
