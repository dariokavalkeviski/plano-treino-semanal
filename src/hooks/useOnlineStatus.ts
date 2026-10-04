import { useEffect, useState } from 'react'
import { observarFila, pendentes, sincronizar } from '@/lib/outbox'

/**
 * Estado de conexão + fila pendente. Ao voltar a conexão, dispara a
 * sincronização automaticamente.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [naFila, setNaFila] = useState(() => pendentes())
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => observarFila(setNaFila), [])

  useEffect(() => {
    let cancelado = false

    async function descarregar() {
      if (cancelado || pendentes() === 0) return
      setSincronizando(true)
      try {
        await sincronizar()
      } finally {
        if (!cancelado) setSincronizando(false)
      }
    }

    function aoConectar() {
      setOnline(true)
      void descarregar()
    }
    function aoDesconectar() {
      setOnline(false)
    }

    window.addEventListener('online', aoConectar)
    window.addEventListener('offline', aoDesconectar)
    if (navigator.onLine) void descarregar()

    return () => {
      cancelado = true
      window.removeEventListener('online', aoConectar)
      window.removeEventListener('offline', aoDesconectar)
    }
  }, [])

  return { online, naFila, sincronizando }
}
