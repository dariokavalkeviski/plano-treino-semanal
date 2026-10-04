import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado.')

// PWA: atualiza em segundo plano e aplica na próxima abertura, para nunca
// recarregar a página no meio de um treino.
registerSW({ immediate: true })

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
