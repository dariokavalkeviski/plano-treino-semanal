import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Icone } from '@/components/ui/Icone'

/**
 * Faixa de status da conexão. Só aparece quando há algo a comunicar:
 * offline, sincronizando ou com alterações na fila.
 */
export function BarraStatus() {
  const { online, naFila, sincronizando } = useOnlineStatus()

  if (online && naFila === 0) return null

  const offline = !online
  const texto = offline
    ? naFila > 0
      ? `Sem conexão — ${naFila} ${naFila === 1 ? 'alteração' : 'alterações'} serão enviadas depois`
      : 'Sem conexão — você pode treinar normalmente'
    : sincronizando
      ? 'Sincronizando suas alterações…'
      : `${naFila} ${naFila === 1 ? 'alteração pendente' : 'alterações pendentes'}`

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
        offline ? 'bg-warn/15 text-warn' : 'bg-lime-400/10 text-lime-300'
      }`}
    >
      <Icone
        nome={offline ? 'nuvem_off' : 'sincronizar'}
        tamanho={14}
        className={sincronizando ? 'animate-spin' : undefined}
      />
      {texto}
    </div>
  )
}
