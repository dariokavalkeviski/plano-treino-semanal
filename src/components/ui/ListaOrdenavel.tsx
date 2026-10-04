import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Icone } from './Icone'
import { cx } from './index'
import { feedbackLeve } from '@/lib/feedback'

interface ComId {
  id: string
}

interface RenderProps {
  /** Props para o "pegador" de arraste (ícone de alça). */
  propsAlca: {
    onPointerDown: (evento: PointerEvent<HTMLElement>) => void
    style: { touchAction: 'none' }
  }
  arrastando: boolean
  /** Mover por botão/teclado — alternativa acessível ao arraste. */
  mover: (direcao: -1 | 1) => void
  podeSubir: boolean
  podeDescer: boolean
  indice: number
}

interface Props<T extends ComId> {
  itens: T[]
  /** Chamado com a nova ordem de ids quando o arraste termina. */
  onReordenar: (idsNaOrdem: string[]) => void
  children: (item: T, render: RenderProps) => ReactNode
  className?: string
}

/**
 * Lista reordenável por arraste, feita com Pointer Events para funcionar no
 * toque (o drag-and-drop nativo do HTML5 não funciona em celular).
 *
 * Toda linha também expõe `mover(-1 | 1)`, que é como o teclado e os leitores
 * de tela reordenam — arrastar nunca é o único caminho.
 */
export function ListaOrdenavel<T extends ComId>({
  itens,
  onReordenar,
  children,
  className,
}: Props<T>) {
  const [ordem, setOrdem] = useState<string[] | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const container = useRef<HTMLUListElement>(null)
  const baseY = useRef(0)

  // A ordem local vale até a prop chegar atualizada (evita o item "pular" de
  // volta durante o arraste). Itens novos entram no fim e itens removidos saem,
  // para a lista não congelar depois de um arraste.
  const idsDaProp = itens.map((i) => i.id)
  const idsAtuais = ordem
    ? [...ordem.filter((id) => idsDaProp.includes(id)), ...idsDaProp.filter((id) => !ordem.includes(id))]
    : idsDaProp
  const visiveis = idsAtuais.flatMap((id) => {
    const item = itens.find((i) => i.id === id)
    return item ? [item] : []
  })

  const aplicar = useCallback(
    (ids: string[]) => {
      setOrdem(ids)
      onReordenar(ids)
    },
    [onReordenar],
  )

  const mover = useCallback(
    (id: string, direcao: -1 | 1) => {
      const ids = [...idsAtuais]
      const de = ids.indexOf(id)
      const para = de + direcao
      if (de < 0 || para < 0 || para >= ids.length) return
      const [removido] = ids.splice(de, 1)
      if (removido) ids.splice(para, 0, removido)
      feedbackLeve()
      aplicar(ids)
    },
    [idsAtuais, aplicar],
  )

  function medirCentros(): { id: string; centro: number }[] {
    const linhas = container.current?.querySelectorAll<HTMLElement>('[data-ordenavel-id]')
    if (!linhas) return []
    return [...linhas].map((linha) => {
      const rect = linha.getBoundingClientRect()
      return { id: linha.dataset['ordenavelId'] ?? '', centro: rect.top + rect.height / 2 }
    })
  }

  function iniciarArraste(id: string, evento: PointerEvent<HTMLElement>) {
    evento.preventDefault()
    evento.currentTarget.setPointerCapture(evento.pointerId)
    baseY.current = evento.clientY
    setOrdem(idsAtuais)
    setArrastandoId(id)
    feedbackLeve()
  }

  function moverArraste(id: string, evento: PointerEvent<HTMLElement>) {
    if (arrastandoId !== id) return
    const y = evento.clientY
    const centros = medirCentros()
    const indiceAtual = centros.findIndex((c) => c.id === id)
    if (indiceAtual < 0) return

    const alvo = centros[indiceAtual + (y > baseY.current ? 1 : -1)]
    if (!alvo) return

    const passou = y > baseY.current ? y > alvo.centro : y < alvo.centro
    if (!passou) return

    const ids = [...idsAtuais]
    const de = ids.indexOf(id)
    const para = ids.indexOf(alvo.id)
    const [removido] = ids.splice(de, 1)
    if (removido) ids.splice(para, 0, removido)

    // Reancora a referência: depois da troca o item já ocupa o novo lugar.
    baseY.current = y
    setOrdem(ids)
    feedbackLeve()
  }

  function terminarArraste() {
    if (!arrastandoId) return
    setArrastandoId(null)
    if (ordem) onReordenar(ordem)
    // Mantém `ordem` até a prop chegar atualizada, evitando um "pulo" visual.
  }

  return (
    <ul ref={container} className={cx('flex flex-col gap-2', className)}>
      {visiveis.map((item, indice) => (
        <li
          key={item.id}
          data-ordenavel-id={item.id}
          onPointerMove={(e) => moverArraste(item.id, e)}
          onPointerUp={terminarArraste}
          onPointerCancel={terminarArraste}
          className={cx(
            'transition-transform',
            arrastandoId === item.id && 'relative z-10 scale-[1.02] opacity-90',
          )}
        >
          {children(item, {
            propsAlca: {
              onPointerDown: (e) => iniciarArraste(item.id, e),
              style: { touchAction: 'none' },
            },
            arrastando: arrastandoId === item.id,
            mover: (direcao) => mover(item.id, direcao),
            podeSubir: indice > 0,
            podeDescer: indice < visiveis.length - 1,
            indice,
          })}
        </li>
      ))}
    </ul>
  )
}

/** Alça de arraste pronta, com rótulo acessível. */
export function AlcaArraste({
  propsAlca,
  rotulo,
}: {
  propsAlca: RenderProps['propsAlca']
  rotulo: string
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={rotulo}
      className="flex h-11 w-8 cursor-grab touch-none items-center justify-center
        text-slate-500 active:cursor-grabbing"
      {...propsAlca}
    >
      <Icone nome="arrastar" tamanho={18} />
    </span>
  )
}
