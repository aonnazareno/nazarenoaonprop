import {
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Eye,
  CheckCircle2,
  Calculator,
  BarChart2,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import type { TasacionResult, TasacionForm, ComparableAnalizado, AjusteAplicado } from '../../types'

interface Props {
  result: TasacionResult
  form: TasacionForm
  comparablesSupabaseCount: number
  comparablesPortalesCount: number
  comparablesManualesCount: number
  onNuevaTasacion: () => void
}

function usd(n: number | null | undefined) {
  if (!n) return '—'
  return `USD ${Math.round(n).toLocaleString('es-AR')}`
}

function pct(n: number) {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

function semaforoStyle(signo: string, desvio: number) {
  if (signo === 'neutral' || desvio < 8)
    return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'En línea con el mercado', dot: 'bg-green-500' }
  if (signo === 'sobrevaluado')
    return desvio > 25
      ? { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Muy sobrevaluado', dot: 'bg-red-500' }
      : { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', label: 'Sobrevaluado', dot: 'bg-orange-500' }
  return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: 'Subvaluado', dot: 'bg-blue-500' }
}

function confianzaBar(pct: number) {
  if (pct >= 75) return 'bg-verde'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

function impactColor(n: number) {
  if (n > 0) return 'text-verde font-semibold'
  if (n < 0) return 'text-red-600 font-semibold'
  return 'text-gris'
}

// ─── Collapsible section ─────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType
  title: string
  badge?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 mb-0"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-verde flex-shrink-0" />
          <h3 className="font-cormorant text-xl font-semibold text-gray-800">{title}</h3>
          {badge && (
            <span className="chip bg-verde-light text-verde text-[11px]">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gris" /> : <ChevronDown size={16} className="text-gris" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function Resultados({
  result,
  form,
  comparablesSupabaseCount,
  comparablesPortalesCount,
  comparablesManualesCount,
  onNuevaTasacion,
}: Props) {
  const semaforo = semaforoStyle(result.desvio_signo, result.desvio_pct)
  const totalComparables = comparablesSupabaseCount + comparablesPortalesCount + comparablesManualesCount
  const comparablesIncluidos = (result.comparables_analizados ?? []).filter((c) => c.incluido)
  const comparablesExcluidos = (result.comparables_analizados ?? []).filter((c) => !c.incluido)

  return (
    <div className="space-y-5 print:space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-cormorant text-3xl font-semibold text-gray-800">
            Informe de tasación
          </h2>
          <p className="text-sm text-gris font-montserrat mt-0.5">
            {[form.tipoPropiedad, form.country, form.ubicacion].filter(Boolean).join(' · ')}
            {' · '}{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 print:hidden">
          <button onClick={onNuevaTasacion} className="btn-secondary">Nueva tasación</button>
          <button onClick={() => window.print()} className="btn-ghost flex items-center gap-2">
            <Download size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* ── Chips de fuentes ── */}
      <div className="flex flex-wrap gap-2">
        {comparablesSupabaseCount > 0 && (
          <span className="chip bg-verde-light text-verde">{comparablesSupabaseCount} de cartera propia</span>
        )}
        {comparablesPortalesCount > 0 && (
          <span className="chip bg-blue-50 text-blue-600">{comparablesPortalesCount} de portales</span>
        )}
        {comparablesManualesCount > 0 && (
          <span className="chip bg-gray-100 text-gris-dark">{comparablesManualesCount} manual{comparablesManualesCount > 1 ? 'es' : ''}</span>
        )}
        {totalComparables === 0 && (
          <span className="chip bg-yellow-50 text-yellow-700">Sin comparables — criterio general</span>
        )}
      </div>

      {/* ── Panel principal: semáforo + rangos + confianza ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Semáforo desvío */}
        <div className={clsx('card border-2 flex flex-col items-center justify-center text-center py-8', semaforo.border, semaforo.bg)}>
          <div className={clsx('w-3 h-3 rounded-full mb-3', semaforo.dot)} />
          {result.desvio_signo === 'sobrevaluado'
            ? <TrendingUp size={22} className={semaforo.text} />
            : result.desvio_signo === 'subvaluado'
            ? <TrendingDown size={22} className={semaforo.text} />
            : <MinusCircle size={22} className={semaforo.text} />}
          <p className={clsx('font-cormorant text-4xl font-bold mt-1', semaforo.text)}>
            {result.desvio_pct > 0 ? '+' : ''}{result.desvio_pct.toFixed(1)}%
          </p>
          <p className={clsx('text-xs font-semibold font-montserrat mt-1', semaforo.text)}>
            {semaforo.label}
          </p>
          {form.precioPretendido && (
            <div className="mt-3 text-xs text-gris space-y-0.5">
              <p>Precio pretendido</p>
              <p className="font-semibold text-gray-700 text-sm">
                USD {parseFloat(form.precioPretendido).toLocaleString('es-AR')}
              </p>
            </div>
          )}
        </div>

        {/* Rango */}
        <div className="card">
          <p className="text-[11px] font-medium text-gris uppercase tracking-wide mb-3">Rango de valor</p>
          <div className="space-y-1.5">
            <RangoRow label="Conservador" value={result.rango_conservador} />
            <RangoRow label="Probable" value={result.rango_probable} highlight />
            <RangoRow label="Optimista" value={result.rango_optimista} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            <p className="text-[11px] text-gris uppercase tracking-wide">Precio de cierre estimado</p>
            <p className="font-cormorant text-xl font-semibold text-gray-800">
              {usd(result.cierre_min)} – {usd(result.cierre_max)}
            </p>
            <p className="text-xs text-gris">Margen de negociación: {result.margen_negociacion}%</p>
          </div>
          {(result.valor_m2_mercado > 0 || result.valor_m2_propiedad > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <MiniStat label="USD/m² mercado" value={usd(result.valor_m2_mercado)} />
              <MiniStat label="USD/m² propiedad" value={usd(result.valor_m2_propiedad)} highlight />
            </div>
          )}
        </div>

        {/* Confianza */}
        <div className="card flex flex-col gap-3">
          <p className="text-[11px] font-medium text-gris uppercase tracking-wide">Confianza del informe</p>
          <div className="flex items-center gap-3">
            <span className={clsx(
              'chip',
              result.confianza_nivel === 'Muy alta' ? 'bg-verde text-white' :
              result.confianza_nivel === 'Alta' ? 'bg-verde-light text-verde' :
              result.confianza_nivel === 'Media' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {result.confianza_nivel}
            </span>
            <span className="font-cormorant text-3xl font-bold text-gray-800">
              {result.confianza_pct}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', confianzaBar(result.confianza_pct))}
              style={{ width: `${result.confianza_pct}%` }}
            />
          </div>
          <p className="text-xs text-gris leading-relaxed">{result.confianza_nota}</p>
          {result.requiere_visita && (
            <div className="flex items-start gap-2 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
              <Eye size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">{result.requiere_visita_motivo}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Variables ── */}
      {(result.variables_suben?.length > 0 || result.variables_bajan?.length > 0 || result.variables_alerta?.length > 0) && (
        <div className="card">
          <p className="text-[11px] font-medium text-gris uppercase tracking-wide mb-3">Variables que impactan el valor</p>
          <div className="flex flex-wrap gap-2">
            {result.variables_suben?.map((v) => (
              <span key={v} className="chip bg-verde-light text-verde">↑ {v}</span>
            ))}
            {result.variables_bajan?.map((v) => (
              <span key={v} className="chip bg-red-50 text-red-600">↓ {v}</span>
            ))}
            {result.variables_alerta?.map((v) => (
              <span key={v} className="chip bg-yellow-50 text-yellow-700">⚠ {v}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Análisis visual ── */}
      {result.analisis_visual && (
        <Section icon={Eye} title="Análisis visual de fotos" badge={`${form.fotos.length} foto${form.fotos.length !== 1 ? 's' : ''}`}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.analisis_visual}</p>
        </Section>
      )}

      {/* ── METODOLOGÍA DETALLADA ── */}
      <Section icon={Calculator} title="Metodología de tasación" defaultOpen>
        <div className="space-y-4">
          <div className="bg-crema rounded-lg p-4">
            <p className="text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">Cómo se llegó a este valor</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.metodologia}</p>
          </div>
          {result.calculo_paso_a_paso && (
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-700 whitespace-pre-line leading-relaxed border border-gray-200">
              <p className="font-sans text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">Cálculo paso a paso</p>
              {result.calculo_paso_a_paso}
            </div>
          )}
        </div>
      </Section>

      {/* ── TABLA DE COMPARABLES ANALIZADOS ── */}
      {result.comparables_analizados?.length > 0 && (
        <Section
          icon={BarChart2}
          title="Comparables analizados"
          badge={`${comparablesIncluidos.length} incluidos / ${comparablesExcluidos.length} excluidos`}
        >
          <div className="space-y-5">
            {/* Incluidos */}
            {comparablesIncluidos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-verde uppercase tracking-wide mb-2">
                  ✓ Usados en la tasación ({comparablesIncluidos.length})
                </p>
                <div className="space-y-2">
                  {comparablesIncluidos.map((c, i) => (
                    <ComparableRow key={i} comp={c} included />
                  ))}
                </div>
              </div>
            )}

            {/* Excluidos */}
            {comparablesExcluidos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">
                  ✗ Descartados ({comparablesExcluidos.length})
                </p>
                <div className="space-y-2">
                  {comparablesExcluidos.map((c, i) => (
                    <ComparableRow key={i} comp={c} included={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── AJUSTES APLICADOS ── */}
      {result.ajustes_aplicados?.length > 0 && (
        <Section icon={Layers} title="Ajustes aplicados">
          <div className="space-y-2">
            {result.ajustes_aplicados.map((a, i) => (
              <AjusteRow key={i} ajuste={a} />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Impacto total de ajustes</span>
            <span className={clsx(
              'font-cormorant text-lg font-bold',
              impactColor(result.ajustes_aplicados.reduce((s, a) => s + a.impacto_pct, 0))
            )}>
              {pct(result.ajustes_aplicados.reduce((s, a) => s + a.impacto_pct, 0))}
            </span>
          </div>
        </Section>
      )}

      {/* ── Justificación ── */}
      <Section icon={AlertTriangle} title="Justificación del valor">
        <p className="text-sm text-gray-700 leading-relaxed">{result.justificacion}</p>
      </Section>

      {/* ── Recomendación estratégica ── */}
      <div className="card border-l-4 border-verde bg-verde-muted">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-verde flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-cormorant text-xl font-semibold text-verde mb-1">
              {result.recomendacion_titulo}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.recomendacion_desc}</p>
          </div>
        </div>
      </div>

      {/* ── Observaciones internas ── */}
      {result.observaciones_internas && (
        <div className="card border border-dashed border-gris">
          <p className="text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">
            Observaciones internas (no mostrar al cliente)
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">{result.observaciones_internas}</p>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-[11px] text-gris leading-relaxed max-w-2xl mx-auto">
          Informe de uso interno exclusivo · Calderón Propiedades (Mat. 227, Zona Oeste GBA) ·
          Valores estimativos basados en comparables de mercado y criterio profesional ·
          No constituye tasación oficial · Precios en USD de referencia, sujetos a condiciones de mercado y negociación.
        </p>
        <p className="text-[11px] text-gris mt-1">
          Generado con IA · {new Date().toLocaleDateString('es-AR')} · TasadorIA v1.0
        </p>
      </div>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function RangoRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-between px-3 py-2 rounded-lg', highlight ? 'bg-verde-muted' : '')}>
      <span className={clsx('text-xs font-montserrat', highlight ? 'text-verde font-semibold' : 'text-gris')}>
        {label}
      </span>
      <span className={clsx('font-cormorant text-lg', highlight ? 'text-verde font-bold' : 'text-gray-500')}>
        {usd(value)}
      </span>
    </div>
  )
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={clsx('p-2 rounded-lg', highlight ? 'bg-verde-muted' : 'bg-crema')}>
      <p className="text-[10px] text-gris uppercase tracking-wide mb-0.5">{label}</p>
      <p className={clsx('text-xs font-semibold', highlight ? 'text-verde' : 'text-gray-800')}>{value}</p>
    </div>
  )
}

function ComparableRow({ comp, included }: { comp: ComparableAnalizado; included: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={clsx(
      'rounded-lg border p-3',
      included ? 'border-verde-light bg-white' : 'border-gray-100 bg-gray-50 opacity-80'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {included
            ? <CheckCircle2 size={14} className="text-verde flex-shrink-0 mt-0.5" />
            : <XCircle size={14} className="text-gris flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{comp.titulo}</p>
            <p className="text-xs text-gris">{comp.fuente}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {comp.valor_m2 && (
            <div className="text-right">
              <p className="text-[10px] text-gris">USD/m²</p>
              <p className="text-xs font-semibold text-gray-700">{comp.valor_m2.toLocaleString('es-AR')}</p>
            </div>
          )}
          {comp.ajuste_pct !== 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gris">Ajuste</p>
              <p className={clsx('text-xs', impactColor(comp.ajuste_pct))}>{pct(comp.ajuste_pct)}</p>
            </div>
          )}
          {comp.valor_m2_ajustado && (
            <div className="text-right">
              <p className="text-[10px] text-gris">Ajustado</p>
              <p className="text-xs font-bold text-verde">{comp.valor_m2_ajustado.toLocaleString('es-AR')}</p>
            </div>
          )}
          <button onClick={() => setOpen((o) => !o)} className="text-gris hover:text-verde transition-colors">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {comp.precio_publicacion && (
              <MiniStat label="Precio publicación" value={usd(comp.precio_publicacion)} />
            )}
            {comp.m2 && (
              <MiniStat label="M²" value={`${comp.m2} m²`} />
            )}
            {comp.valor_m2 && (
              <MiniStat label="USD/m² publicación" value={comp.valor_m2.toLocaleString('es-AR')} />
            )}
            {comp.valor_m2_ajustado && (
              <MiniStat label="USD/m² ajustado" value={comp.valor_m2_ajustado.toLocaleString('es-AR')} highlight />
            )}
          </div>
          {comp.ajuste_motivos && (
            <div className="text-xs text-gray-600 bg-crema rounded p-2">
              <span className="font-semibold">Motivo del ajuste: </span>{comp.ajuste_motivos}
            </div>
          )}
          <div className="text-xs text-gray-600 bg-crema rounded p-2">
            <span className={clsx('font-semibold', included ? 'text-verde' : 'text-gris')}>
              {included ? 'Por qué se incluyó: ' : 'Por qué se descartó: '}
            </span>
            {comp.motivo_inclusion}
          </div>
        </div>
      )}
    </div>
  )
}

function AjusteRow({ ajuste }: { ajuste: AjusteAplicado }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-crema">
      <div className={clsx(
        'w-14 text-center text-xs font-bold font-montserrat py-1 rounded flex-shrink-0',
        ajuste.impacto_pct > 0 ? 'bg-verde-light text-verde' :
        ajuste.impacto_pct < 0 ? 'bg-red-50 text-red-600' :
        'bg-gray-100 text-gris'
      )}>
        {pct(ajuste.impacto_pct)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">{ajuste.concepto}</p>
        <p className="text-xs text-gris mt-0.5">{ajuste.descripcion}</p>
      </div>
    </div>
  )
}

// Necesario para ExternalLink aunque no se use directamente en el render
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = ExternalLink
