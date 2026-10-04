/**
 * Ícones em SVG inline (traço de 2px, grid 24).
 * Evita uma dependência de biblioteca de ícones e mantém o bundle enxuto.
 */

const CAMINHOS = {
  halter: 'M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11',
  casa: 'M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  lista: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  grafico: 'M3 3v18h18M7 15l3.5-4 3 2.5L20 7',
  pessoa: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M7 4.5v15l12-7.5z',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  check: 'm5 13 4.5 4.5L19 7',
  fechar: 'M6 6l12 12M18 6 6 18',
  busca: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  lapis: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  lixeira: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6',
  copiar: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  calendario: 'M8 2v4M16 2v4M3.5 9.5h17M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  fogo: 'M12 22c3.9 0 6.5-2.4 6.5-6 0-4.5-4-6-4.5-11-2.5 1.5-4 4-4 6 0 1.2.4 2 .8 2.6C9.3 12.2 8 11 8 8.5 6.3 10.2 5.5 12.6 5.5 15c0 3.8 2.6 7 6.5 7z',
  trofeu: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4.5a2.5 2.5 0 0 0 2.5 5M17 5h2.5a2.5 2.5 0 0 1-2.5 5',
  regua: 'M3 8.5h18a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM7 9v3M11 9v2M15 9v3M19 9v2',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  seta_esq: 'm15 18-6-6 6-6',
  seta_dir: 'm9 6 6 6-6 6',
  seta_cima: 'm6 15 6-6 6 6',
  seta_baixo: 'm6 9 6 6 6-6',
  arrastar: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  sair: 'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9',
  email: 'M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3.5 7.5l8.5 6 8.5-6',
  cadeado: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  olho: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  olho_fechado: 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.3 6.4C3.8 8 2 12 2 12s3.5 7 10 7c2 0 3.7-.7 5.1-1.6M21.9 13.2C21.1 9.9 17.5 5 12 5c-.5 0-1 0-1.4.1',
  nuvem_off: 'M3 3l18 18M8.5 8.1A5 5 0 0 0 7 18h9M12.3 6a5.5 5.5 0 0 1 5.2 5.3 3.5 3.5 0 0 1 1.6 6',
  sincronizar: 'M21 12a9 9 0 0 1-9 9 9 9 0 0 1-8-5M3 12a9 9 0 0 1 9-9 9 9 0 0 1 8 5M20 4v4h-4M4 20v-4h4',
  filtro: 'M3 5h18l-7 8v6l-4-2v-4z',
  parar: 'M6 6h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  balanca: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9l4-2 4 2M12 7v5',
  alvo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
} as const

export type NomeIcone = keyof typeof CAMINHOS

interface IconeProps {
  nome: NomeIcone
  tamanho?: number
  className?: string
  preenchido?: boolean
}

export function Icone({ nome, tamanho = 20, className, preenchido = false }: IconeProps) {
  const d = CAMINHOS[nome]
  const fechado = nome === 'play' || nome === 'fogo' || nome === 'parar' || preenchido

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={fechado ? 'currentColor' : 'none'}
      stroke={fechado ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
