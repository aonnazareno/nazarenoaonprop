import { Download, AlertTriangle, TrendingUp, TrendingDown, MinusCircle, Eye, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import type { TasacionResult, TasacionForm } from '../../types'

interface Props {
  result: TasacionResult
  form: TasacionForm
  comparablesSupabaseCount: number
  comparablesPortalesCount: number
  comparablesManualesCount: number
  onNuevaTasacion: () => void
}

function usd(n: number) {
  return `USD ${Math.round(n).toLocaleString('es-AR')}`
}

function SemaforoIcon({ signo }: { signo: string }) {
  if (signo === 'sobrevaluado') return <TrendingUp size={18} className="text-red-500" />
  if (signo === 'subvaluado') return <TrendingDown size={18} className="text-green-600" />
  return <MinusCircle size={18} className="text-yellow-500" />
}

function semaforoColor(signo: string, pct: number) {
  if (signo === 'neutral' || pct < 10) return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'En línea con el mercado' }
  if (signo === 'sobrevaluado') {
    if (pct > 25) return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: 'Muy sobrevaluado' }
    return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', label: 'Sobrevaluado' }
  }
  return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: 'Subvaluado' }
}

function confianzaColor(nivel: string) {
  if (nivel === 'Muy alta') return 'bg-verde text-white'
  if (nivel === 'Alta') return 'bg-verde-light text-verde'
  if (nivel === 'Media') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function Resultados({
  result,
  form,
  comparablesSupabaseCount,
  comparablesPortalesCount,
  comparablesManualesCount,
  onNuevaTasacion,
}: Props) {
  const semaforo = semaforoColor(result.desvio_signo, result.desvio_pct)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-cormorant text-3xl font-semibold text-gray-800">
            Informe de tasación
          </h2>
          <p className="text-sm text-gris font-montserrat mt-0.5">
            {form.tipoPropiedad}
            {form.country ? ` · ${form.country}` : ''}
            {form.ubicacion ? ` · ${form.ubicacion}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onNuevaTasacion}
            className="btn-secondary"
          >
            Nueva tasación
          </button>
          <button
            onClick={() => window.print()}
            className="btn-ghost flex items-center gap-2"
          >
            <Download size={14} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Fuentes de comparables */}
      <div className="flex flex-wrap gap-2">
        {comparablesSupabaseCount > 0 && (
          <span className="chip bg-verde-light text-verde">
            {comparablesSupabaseCount} de cartera propia
          </span>
        )}
        {comparablesPortalesCount > 0 && (
          <span className="chip bg-blue-50 text-blue-600">
            {comparablesPortalesCount} de portales
          </span>
        )}
        {comparablesManualesCount > 0 && (
          <span className="chip bg-gray-100 text-gris-dark">
            {comparablesManualesCount} manual{comparablesManualesCount > 1 ? 'es' : ''}
          </span>
        )}
        {comparablesSupabaseCount + comparablesPortalesCount + comparablesManualesCount === 0 && (
          <span className="chip bg-yellow-50 text-yellow-700">Sin comparables — criterio general</span>
        )}
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Semáforo */}
        <div
          className={clsx(
            'card border-2 flex flex-col items-center justify-center text-center py-8',
            semaforo.border,
            semaforo.bg
          )}
        >
          <SemaforoIcon signo={result.desvio_signo} />
          <p className={clsx('font-cormorant text-4xl font-bold mt-2', semaforo.text)}>
            {result.desvio_pct > 0 ? '+' : ''}{result.desvio_pct.toFixed(1)}%
          </p>
          <p className={clsx('text-xs font-medium font-montserrat mt-1', semaforo.text)}>
            {semaforo.label}
          </p>
          {form.precioPretendido && (
            <p className="text-xs text-gris mt-2">
              vs. precio pretendido<br />
              <span className="font-semibold text-gray-700">
                USD {parseFloat(form.precioPretendido).toLocaleString('es-AR')}
              </span>
            </p>
          )}
        </div>

        {/* Rango */}
        <div className="card">
          <p className="text-xs font-medium text-gris uppercase tracking-wide mb-3">Rango de valor</p>
          <div className="space-y-2">
            <RangoRow label="Conservador" value={result.rango_conservador} color="text-gray-500" />
            <RangoRow label="Probable" value={result.rango_probable} color="text-verde font-bold" highlight />
            <RangoRow label="Optimista" value={result.rango_optimista} color="text-gray-500" />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gris mb-1">Precio de cierre estimado</p>
            <p className="font-cormorant text-lg font-semibold text-gray-800">
              {usd(result.cierre_min)} – {usd(result.cierre_max)}
            </p>
            <p className="text-xs text-gris mt-0.5">
              Margen de negociación: {result.margen_negociacion}%
            </p>
          </div>
        </div>

        {/* Confianza */}
        <div className="card flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-gris uppercase tracking-wide mb-3">Confianza del informe</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx('chip', confianzaColor(result.confianza_nivel))}>
                {result.confianza_nivel}
              </span>
              <span className="font-cormorant text-2xl font-bold text-gray-800">
                {result.confianza_pct}%
              </span>
            </div>
            {/* Barra de confianza */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-700',
                  result.confianza_pct >= 70 ? 'bg-verde' :
                  result.confianza_pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                )}
                style={{ width: `${result.confianza_pct}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gris mt-3">{result.confianza_nota}</p>
          {result.requiere_visita && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
              <Eye size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">{result.requiere_visita_motivo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Variables */}
      {(result.variables_suben.length > 0 || result.variables_bajan.length > 0 || result.variables_alerta.length > 0) && (
        <div className="card">
          <p className="text-xs font-medium text-gris uppercase tracking-wide mb-3">Variables relevantes</p>
          <div className="flex flex-wrap gap-2">
            {result.variables_suben.map((v) => (
              <span key={v} className="chip bg-verde-light text-verde">
                ↑ {v}
              </span>
            ))}
            {result.variables_bajan.map((v) => (
              <span key={v} className="chip bg-red-50 text-red-600">
                ↓ {v}
              </span>
            ))}
            {result.variables_alerta.map((v) => (
              <span key={v} className="chip bg-yellow-50 text-yellow-700">
                ⚠ {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Análisis visual */}
      {result.analisis_visual && (
        <div className="card border-l-4 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-blue-500" />
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Análisis visual de fotos</p>
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">{result.analisis_visual}</p>
        </div>
      )}

      {/* Justificación */}
      <div className="card">
        <p className="text-xs font-medium text-gris uppercase tracking-wide mb-2">Justificación de la tasación</p>
        <p className="text-sm text-gray-700 leading-relaxed">{result.justificacion}</p>
      </div>

      {/* Recomendación de estrategia */}
      <div className="card border-l-4 border-verde bg-verde-muted">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-verde flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-cormorant text-xl font-semibold text-verde mb-0.5">
              {result.recomendacion_titulo}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.recomendacion_desc}</p>
          </div>
        </div>
      </div>

      {/* Observaciones internas */}
      {result.observaciones_internas && (
        <div className="card border border-dashed border-gris">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-gris" />
            <p className="text-xs font-semibold text-gris uppercase tracking-wide">Observaciones internas</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{result.observaciones_internas}</p>
        </div>
      )}

      {/* Disclaimer legal */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-[11px] text-gris leading-relaxed max-w-2xl mx-auto">
          Este informe es de uso interno exclusivo de Calderón Propiedades (Mat. 227, Zona Oeste GBA).
          Los valores son estimaciones orientativas basadas en comparables de mercado y criterio profesional.
          No constituye tasación oficial. Los precios en USD son de referencia; pueden variar según condiciones
          del mercado, forma de pago y negociación particular.
        </p>
      </div>
    </div>
  )
}

function RangoRow({ label, value, color, highlight }: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between p-2 rounded-lg',
      highlight ? 'bg-verde-muted' : ''
    )}>
      <span className={clsx('text-xs font-montserrat', highlight ? 'text-verde font-semibold' : 'text-gris')}>
        {label}
      </span>
      <span className={clsx('font-cormorant text-lg', color)}>
        USD {Math.round(value).toLocaleString('es-AR')}
      </span>
    </div>
  )
}

