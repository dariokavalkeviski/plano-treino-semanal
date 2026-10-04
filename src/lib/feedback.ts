/** Aviso sonoro e vibração — usados no fim do descanso e ao bater recorde. */

let contexto: AudioContext | null = null

function obterContexto(): AudioContext | null {
  try {
    type ComWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? (globalThis as ComWebkit).webkitAudioContext
    if (!Ctor) return null
    contexto ??= new Ctor()
    return contexto
  } catch {
    return null
  }
}

/**
 * O iOS só libera áudio depois de um gesto do usuário. Chamamos isto no
 * primeiro toque da tela de treino para o apito do descanso funcionar depois.
 */
export function liberarAudio(): void {
  const ctx = obterContexto()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function bip(frequencia: number, duracao: number, atraso: number, volume = 0.18): void {
  const ctx = obterContexto()
  if (!ctx) return
  const inicio = ctx.currentTime + atraso
  const osc = ctx.createOscillator()
  const ganho = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequencia
  ganho.gain.setValueAtTime(0, inicio)
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.015)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao)
  osc.connect(ganho).connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracao + 0.02)
}

export function vibrar(padrao: number | number[]): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(padrao)
  } catch {
    /* navegador sem suporte */
  }
}

/** Três bips curtos + vibração: descanso terminou, hora da próxima série. */
export function avisarFimDoDescanso(): void {
  bip(880, 0.14, 0)
  bip(880, 0.14, 0.22)
  bip(1174, 0.26, 0.44, 0.22)
  vibrar([180, 90, 180, 90, 300])
}

/** Contagem regressiva dos últimos 3 segundos. */
export function avisarContagem(): void {
  bip(660, 0.08, 0, 0.1)
  vibrar(40)
}

/** Fanfarra curta ao bater recorde pessoal. */
export function celebrarRecorde(): void {
  bip(659, 0.12, 0, 0.16)
  bip(784, 0.12, 0.1, 0.16)
  bip(1047, 0.3, 0.2, 0.2)
  vibrar([60, 50, 60, 50, 220])
}

export function feedbackLeve(): void {
  vibrar(18)
}
