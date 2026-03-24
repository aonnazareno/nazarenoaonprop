import { useState, useEffect } from 'react'
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  ClipboardList,
  RotateCcw,
  BarChart2,
  GitCompare,
  CheckCircle2,
  Circle,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import clsx from 'clsx'
import type { HistorialEntry, CierrePropiedad } from '../../types'
import { getHistorial, deleteHistorialEntry, clearHistorial, updateHistorialEntry } from '../../lib/storage'

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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

// ─── Metrics panel ────────────────────────────────────────────────────────────
function MetricasPanel({ entries }: { entries: HistorialEntry[] }) {
  const [open, setOpen] = useState(false)

  if (entries.length < 2) return null

  // Por zona/country
  const byZona: Record<string, { count: number; sumRango: number; sumDesvio: number; cierres: number; sumCierre: number }> = {}
  for (const e of entries) {
    const zona = e.country || e.ubicacion || 'Sin zona'
    if (!byZona[zona]) byZona[zona] = { count: 0, sumRango: 0, sumDesvio: 0, cierres: 0, sumCierre: 0 }
    byZona[zona].count++
    byZona[zona].sumRango += e.rangoProbable
    byZona[zona].sumDesvio += e.desvio
    if (e.cierre) {
      byZona[zona].cierres++
      byZona[zona].sumCierre += e.cierre.precio
    }
  }

  const zonas = Object.entries(byZona)
    .map(([zona, d]) => ({
      zona,
      count: d.count,
      avgRango: d.sumRango / d.count,
      avgDesvio: d.sumDesvio / d.count,
      cierres: d.cierres,
      avgCierre: d.cierres > 0 ? d.sumCierre / d.cierres : null,
    }))
    .sort((a, b) => b.count - a.count)

  // Por mes
  const byMes: Record<string, number> = {}
  for (const e of entries) {
    const mes = new Date(e.fecha).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    byMes[mes] = (byMes[mes] || 0) + 1
  }
  const meses = Object.entries(byMes).slice(0, 6)

  // Totales
  const totalConCierre = entries.filter((e) => e.cierre).length
  const avgDesvioGlobal = entries.reduce((s, e) => s + e.desvio, 0) / entries.length
  const sobrevaluados = entries.filter((e) => e.desvioSigno === 'sobrevaluado').length

  return (
    <div className="card border border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-verde" />
          <h3 className="font-cormorant text-lg font-semibold text-gray-800">Métricas del historial</h3>
          <span className="chip bg-verde-light text-verde text-[11px]">{entries.length} tasaciones</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gris" /> : <ChevronDown size={16} className="text-gris" />}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* Resumen global */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total tasaciones" value={String(entries.length)} />
            <MetricCard label="Desvío promedio" value={`${avgDesvioGlobal > 0 ? '+' : ''}${avgDesvioGlobal.toFixed(1)}%`} />
            <MetricCard label="Sobrevaluadas" value={`${sobrevaluados} (${Math.round(sobrevaluados / entries.length * 100)}%)`} />
            <MetricCard label="Con cierre registrado" value={`${totalConCierre} / ${entries.length}`} highlight={totalConCierre > 0} />
          </div>

          {/* Por zona */}
          <div>
            <p className="text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">Por zona / country</p>
            <div className="space-y-2">
              {zonas.map(({ zona, count, avgRango, avgDesvio, cierres, avgCierre }) => (
                <div key={zona} className="flex items-center gap-3 p-2.5 bg-crema rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{zona}</p>
                    <p className="text-xs text-gris">{count} tasación{count !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{usd(avgRango)}</p>
                    <p className="text-[10px] text-gris">rango prom.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx('text-xs font-semibold', avgDesvio > 5 ? 'text-red-600' : avgDesvio < -5 ? 'text-blue-600' : 'text-verde')}>
                      {avgDesvio > 0 ? '+' : ''}{avgDesvio.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gris">desvío prom.</p>
                  </div>
                  {avgCierre !== null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{usd(avgCierre)}</p>
                      <p className="text-[10px] text-gris">{cierres} cierres</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Por mes */}
          {meses.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold text-gris uppercase tracking-wide mb-2">Tasaciones por mes</p>
              <div className="flex flex-wrap gap-2">
                {meses.map(([mes, count]) => (
                  <div key={mes} className="flex items-center gap-1.5 bg-crema px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-medium text-gray-700">{mes}</span>
                    <span className="chip bg-verde-light text-verde text-[10px]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={clsx('p-3 rounded-lg', highlight ? 'bg-verde-muted' : 'bg-crema')}>
      <p className="text-[10px] text-gris uppercase tracking-wide mb-0.5">{label}</p>
      <p className={clsx('text-sm font-semibold', highlight ? 'text-verde' : 'text-gray-800')}>{value}</p>
    </div>
  )
}

// ─── Cierre modal ──────────────────────────────────────────────────────────────
function CierreModal({
  entry,
  onSave,
  onClose,
}: {
  entry: HistorialEntry
  onSave: (cierre: CierrePropiedad) => void
  onClose: () => void
}) {
  const [precio, setPrecio] = useState(entry.cierre ? String(entry.cierre.precio) : '')
  const [fecha, setFecha] = useState(
    entry.cierre ? entry.cierre.fecha : new Date().toISOString().split('T')[0]
  )
  const [dias, setDias] = useState(entry.cierre?.diasEnMercado ? String(entry.cierre.diasEnMercado) : '')
  const [notas, setNotas] = useState(entry.cierre?.notas || '')

  const handleSave = () => {
    if (!precio) return
    onSave({
      precio: parseFloat(precio),
      fecha,
      diasEnMercado: dias ? parseInt(dias) : undefined,
      notas: notas || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-cormorant text-xl font-semibold text-gray-800">Registrar cierre</h3>
            <p className="text-xs text-gris mt-0.5 truncate max-w-[280px]">
              {entry.tipoPropiedad}{entry.country ? ` · ${entry.country}` : ''}{entry.ubicacion ? ` · ${entry.ubicacion}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gris hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gris mb-2">
              Tasación: rango probable <span className="font-semibold text-gray-700">{usd(entry.rangoProbable)}</span>
            </p>
          </div>

          <div>
            <label className="label">Precio de cierre (USD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gris text-sm font-medium">USD</span>
              <input
                type="number"
                className="input-field pl-12"
                placeholder="Ej: 265000"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            {precio && entry.rangoProbable && (
              <p className="text-xs text-gris mt-1">
                Diferencia vs tasación:{' '}
                <span className={clsx(
                  'font-semibold',
                  Math.abs((parseFloat(precio) - entry.rangoProbable) / entry.rangoProbable) < 0.1 ? 'text-verde' : 'text-orange-600'
                )}>
                  {((parseFloat(precio) - entry.rangoProbable) / entry.rangoProbable * 100).toFixed(1)}%
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="label">Fecha de cierre</label>
            <input
              type="date"
              className="input-field"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Días en el mercado (opcional)</label>
            <input
              type="number"
              className="input-field"
              placeholder="Ej: 45"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Escritura directa, bajo demanda"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!precio}
              className="btn-primary flex-1"
            >
              Guardar cierre
            </button>
            <button onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Compare modal ─────────────────────────────────────────────────────────────
function CompareModal({
  entries,
  onClose,
}: {
  entries: [HistorialEntry, HistorialEntry]
  onClose: () => void
}) {
  const [a, b] = entries

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen py-8 px-4 flex items-start justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <GitCompare size={18} className="text-verde" />
              <h3 className="font-cormorant text-xl font-semibold text-gray-800">Comparar tasaciones</h3>
            </div>
            <button onClick={onClose} className="text-gris hover:text-gray-700 transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {[a, b].map((e, idx) => (
                <div key={e.id} className={clsx('rounded-xl p-4 border-2', idx === 0 ? 'border-verde bg-verde-muted/30' : 'border-blue-300 bg-blue-50/30')}>
                  <p className={clsx('text-[10px] font-semibold uppercase tracking-widest mb-2', idx === 0 ? 'text-verde' : 'text-blue-600')}>
                    Tasación {idx + 1}
                  </p>
                  <p className="font-medium text-gray-800 text-sm">
                    {e.tipoPropiedad}{e.country ? ` · ${e.country}` : ''}{e.ubicacion ? ` · ${e.ubicacion}` : ''}
                  </p>
                  <p className="text-xs text-gris mb-4">{formatDateShort(e.fecha)}</p>

                  <div className="space-y-2">
                    <CompareRow label="Rango probable" valueA={usd(a.rangoProbable)} valueB={usd(b.rangoProbable)} idx={idx} />
                    <CompareRow
                      label="Rango conservador"
                      valueA={usd(a.result.rango_conservador)}
                      valueB={usd(b.result.rango_conservador)}
                      idx={idx}
                    />
                    <CompareRow
                      label="Rango optimista"
                      valueA={usd(a.result.rango_optimista)}
                      valueB={usd(b.result.rango_optimista)}
                      idx={idx}
                    />
                    <CompareRow
                      label="Precio cierre"
                      valueA={`${usd(a.result.cierre_min)} – ${usd(a.result.cierre_max)}`}
                      valueB={`${usd(b.result.cierre_min)} – ${usd(b.result.cierre_max)}`}
                      idx={idx}
                    />
                    <CompareRow
                      label="USD/m² mercado"
                      valueA={a.result.valor_m2_mercado ? `USD ${a.result.valor_m2_mercado.toLocaleString('es-AR')}` : '—'}
                      valueB={b.result.valor_m2_mercado ? `USD ${b.result.valor_m2_mercado.toLocaleString('es-AR')}` : '—'}
                      idx={idx}
                    />
                    <CompareRow
                      label="Confianza"
                      valueA={`${a.confianza}% · ${a.confianzaNivel}`}
                      valueB={`${b.confianza}% · ${b.confianzaNivel}`}
                      idx={idx}
                    />
                    <CompareRow
                      label="Desvío vs pretendido"
                      valueA={`${a.desvio > 0 ? '+' : ''}${a.desvio.toFixed(1)}% (${a.desvioSigno})`}
                      valueB={`${b.desvio > 0 ? '+' : ''}${b.desvio.toFixed(1)}% (${b.desvioSigno})`}
                      idx={idx}
                    />
                    <CompareRow
                      label="M² cubiertos"
                      valueA={e.form.m2Cubiertos ? `${e.form.m2Cubiertos} m²` : '—'}
                      valueB={e.form.m2Cubiertos ? `${e.form.m2Cubiertos} m²` : '—'}
                      idx={idx}
                    />
                    {(a.cierre || b.cierre) && (
                      <CompareRow
                        label="Precio cierre real"
                        valueA={a.cierre ? usd(a.cierre.precio) : '—'}
                        valueB={b.cierre ? usd(b.cierre.precio) : '—'}
                        idx={idx}
                      />
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-[10px] text-gris uppercase tracking-wide mb-1">Recomendación</p>
                    <p className="text-xs font-semibold text-gray-800">{e.result.recomendacion_titulo}</p>
                    <p className="text-xs text-gris mt-0.5">{e.result.recomendacion_desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareRow({
  label,
  valueA,
  valueB,
  idx,
}: {
  label: string
  valueA: string
  valueB: string
  idx: number
}) {
  const value = idx === 0 ? valueA : valueB
  return (
    <div className="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-3 py-2">
      <span className="text-[10px] text-gris uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Historial({ onOpen }: Props) {
  const [entries, setEntries] = useState<HistorialEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState<string[]>([])
  const [compareEntries, setCompareEntries] = useState<[HistorialEntry, HistorialEntry] | null>(null)
  const [cierreEntry, setCierreEntry] = useState<HistorialEntry | null>(null)

  useEffect(() => {
    setEntries(getHistorial())
  }, [])

  const reload = () => setEntries(getHistorial())

  const handleDelete = (id: string) => {
    deleteHistorialEntry(id)
    reload()
    setCompareSelection((prev) => prev.filter((s) => s !== id))
  }

  const handleClear = () => {
    if (window.confirm('¿Borrar todo el historial? Esta acción no se puede deshacer.')) {
      clearHistorial()
      setEntries([])
      setCompareMode(false)
      setCompareSelection([])
    }
  }

  const toggleCompareSelect = (id: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const handleStartCompare = () => {
    if (compareSelection.length !== 2) return
    const [idA, idB] = compareSelection
    const a = entries.find((e) => e.id === idA)
    const b = entries.find((e) => e.id === idB)
    if (a && b) setCompareEntries([a, b])
  }

  const handleSaveCierre = (cierre: CierrePropiedad) => {
    if (!cierreEntry) return
    updateHistorialEntry(cierreEntry.id, { cierre })
    reload()
    setCierreEntry(null)
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
      {/* Modals */}
      {compareEntries && (
        <CompareModal entries={compareEntries} onClose={() => setCompareEntries(null)} />
      )}
      {cierreEntry && (
        <CierreModal
          entry={cierreEntry}
          onSave={handleSaveCierre}
          onClose={() => setCierreEntry(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">Historial de tasaciones</h2>
          <p className="text-sm text-gris">
            {entries.length} tasación{entries.length !== 1 ? 'es' : ''} guardada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {entries.length >= 2 && (
            <button
              onClick={() => {
                setCompareMode((m) => !m)
                setCompareSelection([])
              }}
              className={clsx(
                'btn-ghost flex items-center gap-2',
                compareMode ? 'text-verde border-verde' : ''
              )}
            >
              <GitCompare size={13} />
              {compareMode ? 'Cancelar comparación' : 'Comparar'}
            </button>
          )}
          <button
            onClick={handleClear}
            className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-600"
          >
            <RotateCcw size={13} />
            Limpiar historial
          </button>
        </div>
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-blue-800">
            Seleccioná <strong>2 tasaciones</strong> para comparar ({compareSelection.length}/2 seleccionadas)
          </p>
          <button
            onClick={handleStartCompare}
            disabled={compareSelection.length !== 2}
            className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
          >
            Ver comparación
          </button>
        </div>
      )}

      {/* Metrics panel */}
      <MetricasPanel entries={entries} />

      {/* Entry list */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={clsx(
              'card hover:shadow-card-hover transition-shadow',
              compareMode && compareSelection.includes(entry.id) && 'ring-2 ring-verde'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Compare checkbox */}
              {compareMode && (
                <button
                  onClick={() => toggleCompareSelect(entry.id)}
                  className="mt-1 flex-shrink-0"
                >
                  {compareSelection.includes(entry.id)
                    ? <CheckCircle2 size={18} className="text-verde" />
                    : <Circle size={18} className="text-gris" />}
                </button>
              )}

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
                    {!compareMode && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gris hover:text-red-500 transition-colors p-1"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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

                {/* Cierre registrado */}
                {entry.cierre ? (
                  <div className="flex items-center gap-2 mb-3 p-2.5 bg-verde-muted rounded-lg">
                    <DollarSign size={13} className="text-verde flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-semibold text-verde">Cerrado: {usd(entry.cierre.precio)}</span>
                      <span className="text-gris ml-2">· {formatDateShort(entry.cierre.fecha)}</span>
                      {entry.cierre.diasEnMercado && (
                        <span className="text-gris ml-2">· {entry.cierre.diasEnMercado} días en mercado</span>
                      )}
                    </div>
                    <button
                      onClick={() => setCierreEntry(entry)}
                      className="text-xs text-verde hover:underline flex-shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCierreEntry(entry)}
                    className="flex items-center gap-1.5 text-xs text-gris hover:text-verde transition-colors mb-3"
                  >
                    <DollarSign size={13} />
                    Registrar cierre
                  </button>
                )}

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
