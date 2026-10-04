import { useCallback, useEffect, useRef, useState } from 'react'
import { avisarContagem, avisarFimDoDescanso } from '@/lib/feedback'

interface EstadoDescanso {
  /** Timestamp em que o descanso termina. */
  terminaEm: number
  total: number
}

/**
 * Cronômetro de descanso entre séries.
 *
 * Trabalha com o horário de término, não com um contador decrescente: assim o
 * tempo continua correto se o celular bloquear a tela ou o app ir para
 * segundo plano durante o descanso.
 */
export function useRestTimer() {
  const [estado, setEstado] = useState<EstadoDescanso | null>(null)
  const [restante, setRestante] = useState(0)
  const ultimoBip = useRef<number | null>(null)
  const avisou = useRef(false)

  useEffect(() => {
    if (!estado) {
      setRestante(0)
      return
    }

    function tique() {
      const segundos = Math.max(0, Math.ceil((estado!.terminaEm - Date.now()) / 1000))
      setRestante(segundos)

      if (segundos === 0) {
        if (!avisou.current) {
          avisou.current = true
          avisarFimDoDescanso()
        }
        setEstado(null)
        return
      }
      // Contagem audível nos últimos 3 segundos, uma vez por segundo.
      if (segundos <= 3 && ultimoBip.current !== segundos) {
        ultimoBip.current = segundos
        avisarContagem()
      }
    }

    tique()
    const intervalo = setInterval(tique, 250)
    return () => clearInterval(intervalo)
  }, [estado])

  const iniciar = useCallback((segundos: number) => {
    if (segundos <= 0) return
    avisou.current = false
    ultimoBip.current = null
    setEstado({ terminaEm: Date.now() + segundos * 1000, total: segundos })
  }, [])

  const cancelar = useCallback(() => {
    avisou.current = true
    setEstado(null)
  }, [])

  const ajustar = useCallback((delta: number) => {
    setEstado((atual) => {
      if (!atual) return atual
      const novoFim = Math.max(Date.now(), atual.terminaEm + delta * 1000)
      return { terminaEm: novoFim, total: Math.max(atual.total + delta, 1) }
    })
  }, [])

  return {
    ativo: estado !== null,
    restante,
    total: estado?.total ?? 0,
    percentual: estado && estado.total > 0 ? (restante / estado.total) * 100 : 0,
    iniciar,
    cancelar,
    ajustar,
  }
}
