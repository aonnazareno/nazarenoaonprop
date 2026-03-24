import { useState, useEffect } from 'react'
import { Trash2, TrendingUp, TrendingDown, MinusCircle, ClipboardList, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { HistorialEntry } from '../../types'
import { getHistorial, deleteHistorialEntry, clearHistorial } from '../../lib/storage'

interface Props {
  onOpen: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function usd(n: number) {
  return `USD ${Math.round(n).toLocaleString('es-AR')}`
}

function semaforoColor(signo: string) {
  if (signo === 'sobrevaluado') return 'bg-red-100 text-red-600'
  if (signo === 'subvaluado') return 'bg-blue-100 text-blue-600'
  return 'bg-green-100 text-green-600'
}

function SemaforoIcon({ signo }: { signo: string }) {
  if (signo === 'sobrevaluado') return <TrendingUp size={13} />
  if (signo === 'subvaluado') return <TrendingDown size={13} />
  return <MinusCircle size={13} />
}

export default function Historial({ onOpen }: Props) {
  const [entries, setEntries] = useState<HistorialEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setEntries(getHistorial())
  }, [])

  const handleDelete = (id: string) => {
    deleteHistorialEntry(id)
    setEntries(getHistorial())
  }

  const handleClear = () => {
    if (window.confirm('¿Borrar todo el historial? Esta acción no se puede deshacer.')) {
      clearHistorial()
      setEntries([])
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList size={40} className="text-gris mb-4" />
        <h3 className="font-cormorant text-2xl font-semibold text-gray-700 mb-2">
          Sin tasaciones guardadas
        </h3>
        <p className="text-sm text-gris mb-6">
          Las tasaciones que generes aparecerán acá automáticamente.
        </p>
        <button onClick={onOpen} className="btn-primary">
          Crear primera tasación
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Historial de tasaciones</h2>
          <p className="text-sm text-gris">
            {entries.length} tasación{entries.length !== 1 ? 'es' : ''} guardada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleClear}
          className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-600"
        >
          <RotateCcw size={13} />
          Limpiar historial
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {entry.tipoPropiedad}
                      {entry.country ? ` · ${entry.country}` : ''}
                      {entry.ubicacion ? ` · ${entry.ubicacion}` : ''}
                    </p>
                    <p className="text-xs text-gris mt-0.5">{formatDate(entry.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={clsx('chip', semaforoColor(entry.desvioSigno))}
                    >
                      <SemaforoIcon signo={entry.desvioSigno} />
                      {entry.desvio > 0 ? '+' : ''}
                      {entry.desvio.toFixed(1)}%
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-gris hover:text-red-500 transition-colors p-1"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Rango probable" value={usd(entry.rangoProbable)} />
                  <Stat
                    label="Confianza"
                    value={`${entry.confianza}% · ${entry.confianzaNivel}`}
                  />
                  <Stat
                    label="M² cubiertos"
                    value={entry.form.m2Cubiertos ? `${entry.form.m2Cubiertos} m²` : '—'}
                  />
                </div>

                <button
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  className="text-xs text-verde hover:underline font-medium"
                >
                  {expanded === entry.id ? 'Ocultar detalle' : 'Ver informe completo'}
                </button>

                {expanded === entry.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Rango conservador" value={usd(entry.result.rango_conservador)} />
                      <Stat label="Rango probable" value={usd(entry.result.rango_probable)} highlight />
                      <Stat label="Rango optimista" value={usd(entry.result.rango_optimista)} />
                      <Stat
                        label="Precio cierre min"
                        value={usd(entry.result.cierre_min)}
                      />
                      <Stat
                        label="Precio cierre max"
                        value={usd(entry.result.cierre_max)}
                      />
                      <Stat
                        label="Margen negociación"
                        value={`${entry.result.margen_negociacion}%`}
                      />
                    </div>

                    {entry.result.variables_suben.length > 0 || entry.result.variables_bajan.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.result.variables_suben.map((v) => (
                          <span key={v} className="chip bg-verde-light text-verde text-[11px]">↑ {v}</span>
                        ))}
                        {entry.result.variables_bajan.map((v) => (
                          <span key={v} className="chip bg-red-50 text-red-600 text-[11px]">↓ {v}</span>
                        ))}
                        {entry.result.variables_alerta.map((v) => (
                          <span key={v} className="chip bg-yellow-50 text-yellow-700 text-[11px]">⚠ {v}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="bg-verde-muted rounded-lg p-3">
                      <p className="text-xs font-semibold text-verde mb-1">
                        {entry.result.recomendacion_titulo}
                      </p>
                      <p className="text-xs text-gray-600">{entry.result.recomendacion_desc}</p>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {entry.result.justificacion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={clsx('p-2 rounded-lg', highlight ? 'bg-verde-muted' : 'bg-crema')}>
      <p className="text-[10px] text-gris uppercase tracking-wide mb-0.5">{label}</p>
      <p className={clsx('text-xs font-semibold', highlight ? 'text-verde' : 'text-gray-800')}>
        {value}
      </p>
    </div>
  )
}
