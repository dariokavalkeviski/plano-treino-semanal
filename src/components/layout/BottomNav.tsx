import { NavLink } from 'react-router-dom'
import { Icone, type NomeIcone } from '@/components/ui/Icone'
import { cx } from '@/components/ui'

const ITENS: { para: string; rotulo: string; icone: NomeIcone }[] = [
  { para: '/', rotulo: 'Início', icone: 'casa' },
  { para: '/treinos', rotulo: 'Treinos', icone: 'lista' },
  { para: '/exercicios', rotulo: 'Exercícios', icone: 'halter' },
  { para: '/evolucao', rotulo: 'Evolução', icone: 'grafico' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'pessoa' },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-base-800/95 backdrop-blur-lg"
    >
      <ul className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
        {ITENS.map((item) => (
          <li key={item.para} className="flex-1">
            <NavLink
              to={item.para}
              end={item.para === '/'}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 py-2',
                  'text-[11px] font-medium transition-colors',
                  isActive ? 'text-lime-400' : 'text-slate-400 hover:text-slate-200',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'flex h-7 w-12 items-center justify-center rounded-lg transition-colors',
                      isActive && 'bg-lime-400/15',
                    )}
                  >
                    <Icone nome={item.icone} tamanho={21} />
                  </span>
                  <span>{item.rotulo}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
