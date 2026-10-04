/** Formatações e utilidades de data/número em pt-BR. */

export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  if (m > 0) return `${m}min ${String(seg).padStart(2, '0')}s`
  return `${seg}s`
}

export function formatarCronometro(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function formatarPeso(kg: number): string {
  const n = Number(kg)
  if (!Number.isFinite(n)) return '0 kg'
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace('.', ',')} kg`
}

export function formatarNumero(valor: number, decimais = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor)
}

export function formatarVolume(kg: number): string {
  if (kg >= 1000) return `${formatarNumero(kg / 1000, 1)} t`
  return `${formatarNumero(kg)} kg`
}

/** 'YYYY-MM-DD' no fuso local (evita o deslocamento do toISOString). */
export function paraDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Interpreta 'YYYY-MM-DD' como data local, não UTC. */
export function deDataISO(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)
}

export function hojeISO(): string {
  return paraDataISO(new Date())
}

export function formatarData(iso: string): string {
  const d = iso.length <= 10 ? deDataISO(iso) : new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(d)
}

export function formatarDataCurta(iso: string): string {
  const d = iso.length <= 10 ? deDataISO(iso) : new Date(iso)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d)
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_SEMANA_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function nomeDiaSemana(data: Date): string {
  return DIAS_SEMANA[data.getDay()] ?? ''
}

export function nomeMes(data: Date): string {
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data)
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

export function inicioDaSemana(data: Date): Date {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  // Semana ISO do Postgres (date_trunc('week')) começa na segunda-feira.
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function diferencaEmDias(a: Date, b: Date): number {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((d1 - d2) / 86_400_000)
}

/** 1RM estimado pela fórmula de Epley, usado para comparar séries. */
export function estimar1RM(peso: number, reps: number): number {
  if (peso <= 0 || reps <= 0) return 0
  return peso * (1 + reps / 30)
}

export function calcularIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm) return null
  const m = alturaCm / 100
  return pesoKg / (m * m)
}

export function classificarIMC(imc: number): { rotulo: string; cor: string } {
  if (imc < 18.5) return { rotulo: 'Abaixo do peso', cor: 'text-warn' }
  if (imc < 25) return { rotulo: 'Peso normal', cor: 'text-ok' }
  if (imc < 30) return { rotulo: 'Sobrepeso', cor: 'text-warn' }
  return { rotulo: 'Obesidade', cor: 'text-danger' }
}
