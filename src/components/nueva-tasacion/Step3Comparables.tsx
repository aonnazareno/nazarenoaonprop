import { useState } from 'react'
import {
  Database,
  Globe,
  PlusCircle,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Trash2,
  Search,
} from 'lucide-react'
import clsx from 'clsx'
import type { TasacionForm, ComparableSupabase, ComparableExternal, ComparableManual } from '../../types'
import { fetchProperties, computeComparables } from '../../lib/supabase'
import { searchPortales } from '../../lib/claude'

interface Props {
  form: TasacionForm
  onChange: (updates: Partial<TasacionForm>) => void
}

type SubTab = 'automatica' | 'manual'

function formatUSD(n: number | null) {
  if (!n) return '—'
  return `USD ${n.toLocaleString('es-AR')}`
}

export default function Step3Comparables({ form, onChange }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('automatica')
  const [loadingSupabase, setLoadingSupabase] = useState(false)
  const [loadingPortales, setLoadingPortales] = useState(false)
  const [errorSupabase, setErrorSupabase] = useState('')
  const [errorPortales, setErrorPortales] = useState('')

  // Manual form
  const [manualForm, setManualForm] = useState({
    descripcion: '',
    precio: '',
    m2: '',
    zona: '',
    fuente: '',
  })

  // ─── Supabase ───────────────────────────────────────────────────────────────
  const handleFetchSupabase = async () => {
    setLoadingSupabase(true)
    setErrorSupabase('')
    try {
      const props = await fetchProperties()
      const comparables = computeComparables(props, form)
      onChange({ comparablesSupabase: comparables })
    } catch (e) {
      setErrorSupabase(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoadingSupabase(false)
    }
  }

  const toggleSupabase = (id: string) => {
    onChange({
      comparablesSupabase: form.comparablesSupabase.map((c) =>
        c.id === id ? { ...c, seleccionado: !c.seleccionado } : c
      ),
    })
  }

  // ─── Portales ───────────────────────────────────────────────────────────────
  const handleSearchPortales = async () => {
    setLoadingPortales(true)
    setErrorPortales('')
    try {
      const results = await searchPortales(form)
      onChange({ comparablesPortales: results })
    } catch (e) {
      setErrorPortales(e instanceof Error ? e.message : 'Error buscando en portales')
    } finally {
      setLoadingPortales(false)
    }
  }

  const togglePortal = (id: string) => {
    onChange({
      comparablesPortales: form.comparablesPortales.map((c) =>
        c.id === id ? { ...c, seleccionado: !c.seleccionado } : c
      ),
    })
  }

  // ─── Manual ─────────────────────────────────────────────────────────────────
  const addManual = () => {
    if (!manualForm.descripcion && !manualForm.precio) return
    const entry: ComparableManual = {
      id: `manual-${Date.now()}`,
      ...manualForm,
      seleccionado: true,
    }
    onChange({ comparablesManuales: [...form.comparablesManuales, entry] })
    setManualForm({ descripcion: '', precio: '', m2: '', zona: '', fuente: '' })
  }

  const toggleManual = (id: string) => {
    onChange({
      comparablesManuales: form.comparablesManuales.map((c) =>
        c.id === id ? { ...c, seleccionado: !c.seleccionado } : c
      ),
    })
  }

  const removeManual = (id: string) => {
    onChange({ comparablesManuales: form.comparablesManuales.filter((c) => c.id !== id) })
  }

  const totalSeleccionados =
    form.comparablesSupabase.filter((c) => c.seleccionado).length +
    form.comparablesPortales.filter((c) => c.seleccionado).length +
    form.comparablesManuales.filter((c) => c.seleccionado).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Comparables de mercado</h2>
        <p className="text-sm text-gris font-montserrat">
          Seleccioná los más representativos. La IA usará solo los marcados (
          <span className="font-semibold text-verde">{totalSeleccionados}</span> seleccionados).
        </p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 bg-crema-dark p-1 rounded-lg w-fit">
        {(['automatica', 'manual'] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium font-montserrat transition-all',
              subTab === t ? 'bg-white text-verde shadow-sm' : 'text-gris-dark hover:text-gray-700'
            )}
          >
            {t === 'automatica' ? 'Búsqueda automática' : 'Carga manual'}
          </button>
        ))}
      </div>

      {subTab === 'automatica' && (
        <div className="space-y-5">
          {/* ─── Cartera propia ─── */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-verde" />
                <h3 className="font-cormorant text-lg font-semibold">Tu cartera</h3>
                <span className="chip bg-verde-light text-verde text-[11px]">
                  {form.comparablesSupabase.length} resultados
                </span>
              </div>
              <button
                onClick={handleFetchSupabase}
                disabled={loadingSupabase}
                className="btn-primary flex items-center gap-2"
              >
                {loadingSupabase ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                {loadingSupabase ? 'Buscando...' : 'Buscar similares'}
              </button>
            </div>

            {errorSupabase && (
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-3">{errorSupabase}</p>
            )}

            {form.comparablesSupabase.length === 0 && !loadingSupabase && (
              <p className="text-sm text-gris text-center py-4">
                Hacé click en "Buscar similares" para traer propiedades de tu cartera
              </p>
            )}

            <div className="space-y-2">
              {form.comparablesSupabase.map((c) => (
                <SupabaseCard key={c.id} comp={c} onToggle={() => toggleSupabase(c.id)} />
              ))}
            </div>
          </div>

          {/* ─── Portales externos ─── */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-verde" />
                <h3 className="font-cormorant text-lg font-semibold">Portales externos</h3>
                <span className="chip bg-blue-50 text-blue-600 text-[11px]">
                  Zonaprop · Argenprop · ML
                </span>
              </div>
              <button
                onClick={handleSearchPortales}
                disabled={loadingPortales}
                className="btn-primary flex items-center gap-2"
              >
                {loadingPortales ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Globe size={14} />
                )}
                {loadingPortales ? 'Buscando...' : 'Buscar en portales'}
              </button>
            </div>
            <p className="text-xs text-gris mb-3">
              Usa IA con búsqueda web para encontrar publicaciones similares en tiempo real.
            </p>

            {errorPortales && (
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-3">{errorPortales}</p>
            )}

            {form.comparablesPortales.length === 0 && !loadingPortales && (
              <p className="text-sm text-gris text-center py-4">
                Hacé click en "Buscar en portales" para buscar con IA
              </p>
            )}

            <div className="space-y-2">
              {form.comparablesPortales.map((c) => (
                <PortalCard key={c.id} comp={c} form={form} onToggle={() => togglePortal(c.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'manual' && (
        <div className="card space-y-4">
          <h3 className="font-cormorant text-lg font-semibold">Agregar comparable manualmente</h3>
          <p className="text-xs text-gris">
            Podés escribir "no sé" o valores aproximados — la IA los interpreta en contexto.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Casa 3 amb en San Patricio, escriturada"
                value={manualForm.descripcion}
                onChange={(e) => setManualForm({ ...manualForm, descripcion: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Precio</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: USD 280.000 o no sé"
                value={manualForm.precio}
                onChange={(e) => setManualForm({ ...manualForm, precio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">M² aprox.</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: 200m² o aprox 180"
                value={manualForm.m2}
                onChange={(e) => setManualForm({ ...manualForm, m2: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Zona</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: San Patricio, Luján"
                value={manualForm.zona}
                onChange={(e) => setManualForm({ ...manualForm, zona: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Fuente</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Zonaprop, colega, conocido"
                value={manualForm.fuente}
                onChange={(e) => setManualForm({ ...manualForm, fuente: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={addManual}
            className="btn-primary flex items-center gap-2"
            disabled={!manualForm.descripcion && !manualForm.precio}
          >
            <PlusCircle size={14} />
            Agregar comparable
          </button>

          {/* Lista manuales */}
          {form.comparablesManuales.length > 0 && (
            <div className="space-y-2 mt-2">
              {form.comparablesManuales.map((c) => (
                <div
                  key={c.id}
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    c.seleccionado ? 'border-verde bg-verde-muted' : 'border-gray-200 bg-gray-50'
                  )}
                  onClick={() => toggleManual(c.id)}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {c.seleccionado ? (
                      <CheckCircle2 size={16} className="text-verde" />
                    ) : (
                      <Circle size={16} className="text-gris" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.descripcion}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-gris">
                      {c.precio && <span>{c.precio}</span>}
                      {c.m2 && <span>{c.m2}</span>}
                      {c.zona && <span>{c.zona}</span>}
                      {c.fuente && <span className="text-blue-500">{c.fuente}</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeManual(c.id) }}
                    className="text-gris hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Supabase card ────────────────────────────────────────────────────────────
function SupabaseCard({
  comp,
  onToggle,
}: {
  comp: ComparableSupabase
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        comp.seleccionado ? 'border-verde bg-verde-muted' : 'border-gray-100 hover:border-gray-200 bg-white'
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        {comp.seleccionado ? (
          <CheckCircle2 size={16} className="text-verde" />
        ) : (
          <Circle size={16} className="text-gris" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 truncate">{comp.title}</p>
          <span
            className={clsx(
              'chip text-[10px] flex-shrink-0',
              comp.score >= 70
                ? 'bg-verde-light text-verde'
                : comp.score >= 40
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-gray-100 text-gris-dark'
            )}
          >
            {comp.score}% similar
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gris">
          {comp.neighborhood && <span>{comp.neighborhood}</span>}
          {comp.price && (
            <span className="font-medium text-gray-700">
              {comp.currency ?? 'USD'} {comp.price.toLocaleString('es-AR')}
            </span>
          )}
          {comp.surface_covered && <span>{comp.surface_covered} m² cub.</span>}
          {comp.surface_total && <span>{comp.surface_total} m² tot.</span>}
          {comp.bedrooms && <span>{comp.bedrooms} amb.</span>}
          {comp.property_type && (
            <span className="capitalize">{comp.property_type}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Portal similarity score ──────────────────────────────────────────────────
function portalSimilarityScore(comp: ComparableExternal, form: TasacionForm): number {
  let score = 0

  // ZONA (40 pts)
  const zona = (comp.zona ?? '').toLowerCase()
  const country = (form.country ?? '').toLowerCase()
  const ubicacion = (form.ubicacion ?? '').toLowerCase()
  if (country && zona.includes(country)) {
    score += 40
  } else if (ubicacion && zona.includes(ubicacion)) {
    score += 35
  } else if (ubicacion) {
    const words = ubicacion.split(/\s+/).filter((w) => w.length >= 4)
    if (words.some((w) => zona.includes(w))) score += 15
  }

  // M² (25 pts)
  const formM2 = parseFloat(form.m2Cubiertos ?? '')
  const compM2 = comp.m2_cubiertos
  if (!isNaN(formM2) && formM2 > 0 && compM2 && compM2 > 0) {
    const ratio = Math.abs(formM2 - compM2) / formM2
    if (ratio <= 0.10) score += 25
    else if (ratio <= 0.20) score += 18
    else if (ratio <= 0.30) score += 10
    else if (ratio <= 0.50) score += 5
  }

  // PRECIO (20 pts)
  const formPrecio = parseFloat(form.precioPretendido ?? '')
  const compPrecio = comp.precio_usd
  if (!isNaN(formPrecio) && formPrecio > 0 && compPrecio && compPrecio > 0) {
    const ratio = Math.abs(formPrecio - compPrecio) / formPrecio
    if (ratio <= 0.15) score += 20
    else if (ratio <= 0.30) score += 12
    else if (ratio <= 0.50) score += 6
  }

  // AMBIENTES (15 pts)
  const formAmb = parseInt(form.ambientes ?? '0', 10)
  const compAmb = comp.ambientes
  if (formAmb > 0 && compAmb && compAmb > 0) {
    const diff = Math.abs(formAmb - compAmb)
    if (diff === 0) score += 15
    else if (diff === 1) score += 8
    else if (diff === 2) score += 3
  }

  return Math.min(100, score)
}

// ─── Portal card ──────────────────────────────────────────────────────────────
function PortalCard({
  comp,
  form,
  onToggle,
}: {
  comp: ComparableExternal
  form: TasacionForm
  onToggle: () => void
}) {
  const score = portalSimilarityScore(comp, form)
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border transition-all',
        comp.seleccionado ? 'border-verde bg-verde-muted' : 'border-gray-100 hover:border-gray-200 bg-white'
      )}
    >
      <div
        className="mt-0.5 flex-shrink-0 cursor-pointer"
        onClick={onToggle}
      >
        {comp.seleccionado ? (
          <CheckCircle2 size={16} className="text-verde" />
        ) : (
          <Circle size={16} className="text-gris" />
        )}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-800">{comp.titulo}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={clsx(
                'chip text-[10px]',
                score >= 70
                  ? 'bg-verde-light text-verde'
                  : score >= 40
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-gray-100 text-gris-dark'
              )}
            >
              {score}% similar
            </span>
            <span className="chip bg-blue-50 text-blue-600 text-[10px]">
              {comp.fuente}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gris">
          {comp.zona && <span>{comp.zona}</span>}
          {comp.precio_usd && (
            <span className="font-medium text-gray-700">USD {comp.precio_usd.toLocaleString('es-AR')}</span>
          )}
          {comp.precio_ars && !comp.precio_usd && (
            <span className="font-medium text-gray-700">ARS {comp.precio_ars.toLocaleString('es-AR')}</span>
          )}
          {comp.m2_cubiertos && <span>{comp.m2_cubiertos} m² cub.</span>}
          {comp.m2_lote && <span>{comp.m2_lote} m² lote</span>}
          {comp.ambientes && <span>{comp.ambientes} amb.</span>}
          {comp.estado && <span>{comp.estado}</span>}
        </div>
      </div>
      {comp.url_referencia && (
        <a
          href={comp.url_referencia}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gris hover:text-verde transition-colors p-1 flex-shrink-0"
          title="Ver publicación"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}

export { formatUSD }
