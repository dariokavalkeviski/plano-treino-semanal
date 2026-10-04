import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EstadoVazio } from '@/components/ui'
import { formatarDataCurta, formatarNumero, formatarVolume } from '@/lib/format'
import type { ExerciseProgressRow, WeeklyStatRow } from '@/types/database'
import type { BodyMeasurement } from '@/types/database'
import type { CampoMedida } from '@/hooks/useMeasurements'

/* Paleta única para todos os gráficos: destaque verde-limão sobre fundo escuro. */
const DESTAQUE = '#c2f542'
const SECUNDARIA = '#3ddc97'
const GRADE = 'rgba(255,255,255,0.07)'
const TEXTO = '#94a3b8'

const eixoBase = {
  stroke: TEXTO,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

/** Tooltip com o visual do app (o padrão do Recharts é claro). */
function CaixaDica({
  active,
  payload,
  label,
  formatar,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string }[]
  label?: string | number
  formatar?: (valor: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-base-700 px-3 py-2 shadow-xl">
      {label != null && <p className="mb-1 text-xs font-semibold text-slate-300">{label}</p>}
      {payload.map((item, indice) => (
        <p key={indice} className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
          {item.name}:{' '}
          {typeof item.value === 'number' && formatar ? formatar(item.value) : item.value}
        </p>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Evolução de carga de um exercício                                          */
/* -------------------------------------------------------------------------- */

export function GraficoCarga({ dados }: { dados: ExerciseProgressRow[] }) {
  if (dados.length < 2) {
    return (
      <EstadoVazio
        icone="grafico"
        titulo="Poucos dados ainda"
        descricao="Registre este exercício em pelo menos dois treinos para ver a curva de evolução de carga."
      />
    )
  }

  const pontos = dados.map((d) => ({
    data: formatarDataCurta(d.performed_on),
    carga: Number(d.best_weight),
    volume: Number(d.volume_kg),
  }))

  return (
    <div className="card p-3 pt-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={pontos} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="data" {...eixoBase} />
          <YAxis {...eixoBase} width={46} unit=" kg" />
          <Tooltip
            content={<CaixaDica formatar={(v) => `${formatarNumero(v, 1)} kg`} />}
            cursor={{ stroke: GRADE }}
          />
          <Line
            type="monotone"
            dataKey="carga"
            name="Melhor carga"
            stroke={DESTAQUE}
            strokeWidth={2.5}
            dot={{ r: 3, fill: DESTAQUE, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Volume semanal                                                             */
/* -------------------------------------------------------------------------- */

export function GraficoVolumeSemanal({ dados }: { dados: WeeklyStatRow[] }) {
  const pontos = dados.map((d) => ({
    semana: formatarDataCurta(d.week_start),
    volume: Number(d.volume_kg),
    series: Number(d.sets_count),
  }))

  if (pontos.every((p) => p.volume === 0)) {
    return (
      <EstadoVazio
        icone="grafico"
        titulo="Sem volume registrado"
        descricao="O volume é séries × repetições × carga. Conclua séries com carga para começar a acompanhar."
      />
    )
  }

  return (
    <div className="card p-3 pt-4">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={pontos} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DESTAQUE} stopOpacity={0.45} />
              <stop offset="100%" stopColor={DESTAQUE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="semana" {...eixoBase} interval="preserveStartEnd" />
          <YAxis
            {...eixoBase}
            width={52}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))}
          />
          <Tooltip content={<CaixaDica formatar={formatarVolume} />} cursor={{ stroke: GRADE }} />
          <Area
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke={DESTAQUE}
            strokeWidth={2.5}
            fill="url(#gradVolume)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Frequência semanal                                                         */
/* -------------------------------------------------------------------------- */

export function GraficoFrequencia({ dados }: { dados: WeeklyStatRow[] }) {
  const pontos = dados.map((d) => ({
    semana: formatarDataCurta(d.week_start),
    treinos: Number(d.workouts_count),
  }))

  if (pontos.every((p) => p.treinos === 0)) {
    return (
      <EstadoVazio
        icone="calendario"
        titulo="Sem treinos registrados"
        descricao="Finalize um treino para ele aparecer na frequência semanal."
      />
    )
  }

  return (
    <div className="card p-3 pt-4">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={pontos} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="semana" {...eixoBase} interval="preserveStartEnd" />
          <YAxis {...eixoBase} width={40} allowDecimals={false} />
          <Tooltip
            content={<CaixaDica formatar={(v) => `${v} ${v === 1 ? 'treino' : 'treinos'}`} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="treinos" name="Treinos" fill={DESTAQUE} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Medidas corporais                                                          */
/* -------------------------------------------------------------------------- */

export function GraficoMedidas({
  medidas,
  campo,
  rotulo,
  unidade,
}: {
  medidas: BodyMeasurement[]
  campo: CampoMedida
  rotulo: string
  unidade: string
}) {
  const pontos = medidas
    .filter((m) => m[campo] !== null)
    .map((m) => ({ data: formatarDataCurta(m.measured_on), valor: Number(m[campo]) }))

  if (pontos.length < 2) {
    return (
      <EstadoVazio
        icone="regua"
        titulo={`${rotulo}: poucos dados`}
        descricao="Registre esta medida em pelo menos duas datas para ver a evolução."
      />
    )
  }

  return (
    <div className="card p-3 pt-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={pontos} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRADE} vertical={false} />
          <XAxis dataKey="data" {...eixoBase} />
          <YAxis {...eixoBase} width={46} domain={['auto', 'auto']} />
          <Tooltip
            content={<CaixaDica formatar={(v) => `${formatarNumero(v, 1)} ${unidade}`} />}
            cursor={{ stroke: GRADE }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            name={rotulo}
            stroke={SECUNDARIA}
            strokeWidth={2.5}
            dot={{ r: 3, fill: SECUNDARIA, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
