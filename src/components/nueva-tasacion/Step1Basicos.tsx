import { useState } from 'react'
import { ChevronDown, Database, Loader2, Search, X, CheckCircle2 } from 'lucide-react'
import type { TasacionForm, SupabaseProperty } from '../../types'
import { TIPOS_PROPIEDAD, COUNTRIES, URGENCIA_OPTIONS } from '../../types'
import { fetchProperties } from '../../lib/supabase'
import clsx from 'clsx'

interface Props {
  form: TasacionForm
  onChange: (updates: Partial<TasacionForm>) => void
}

const isCountryType = (tipo: string) =>
  tipo.toLowerCase().includes('country') || tipo.toLowerCase().includes('bc')

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportarModal({
  onImport,
  onClose,
}: {
  onImport: (prop: SupabaseProperty) => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [props, setProps] = useState<SupabaseProperty[]>([])
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchProperties()
      setProps(data)
      setFetched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con Supabase')
    } finally {
      setLoading(false)
    }
  }

  const filtered = props.filter((p) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      p.title?.toLowerCase().includes(q) ||
      p.neighborhood?.toLowerCase().includes(q) ||
      p.property_type?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-verde" />
            <h3 className="font-cormorant text-xl font-semibold text-gray-800">Importar desde cartera</h3>
          </div>
          <button onClick={onClose} className="text-gris hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 flex-1 min-h-0">
          {!fetched ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <p className="text-sm text-gris text-center">
                Cargá tu cartera para pre-completar los datos de la propiedad.
              </p>
              {error && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded w-full text-center">{error}</p>
              )}
              <button
                onClick={handleFetch}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                {loading ? 'Cargando...' : 'Cargar cartera'}
              </button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
                <input
                  type="text"
                  className="input-field pl-9"
                  placeholder="Buscar por nombre, barrio, tipo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <p className="text-xs text-gris">
                {filtered.length} propiedad{filtered.length !== 1 ? 'es' : ''}
                {query ? ` para "${query}"` : ' en tu cartera'}
              </p>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onImport(p)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-verde hover:bg-verde-muted transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-verde">
                          {p.title || 'Sin nombre'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gris">
                          {p.neighborhood && <span>{p.neighborhood}</span>}
                          {p.property_type && <span className="capitalize">{p.property_type}</span>}
                          {p.surface_covered && <span>{p.surface_covered} m² cub.</span>}
                          {p.surface_total && <span>{p.surface_total} m² tot.</span>}
                          {p.bedrooms && <span>{p.bedrooms} amb.</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {p.price && (
                          <p className="text-sm font-semibold text-gray-700">
                            {p.currency ?? 'USD'} {p.price.toLocaleString('es-AR')}
                          </p>
                        )}
                        <p className={clsx('text-[10px] capitalize mt-0.5', p.status === 'active' ? 'text-verde' : 'text-gris')}>
                          {p.status}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-gris text-center py-8">Sin resultados para "{query}"</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Step1Basicos({ form, onChange }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [importedTitle, setImportedTitle] = useState('')

  const handleImport = (prop: SupabaseProperty) => {
    // Map Supabase property fields to TasacionForm
    const updates: Partial<TasacionForm> = {}

    // Tipo de propiedad
    if (prop.property_type) {
      const tipo = prop.property_type.toLowerCase()
      if (tipo.includes('casa')) updates.tipoPropiedad = isCountryType(prop.neighborhood || '') ? 'Casa en country/BC' : 'Casa'
      else if (tipo.includes('lote')) updates.tipoPropiedad = 'Lote'
      else if (tipo.includes('depto') || tipo.includes('departamento')) updates.tipoPropiedad = 'Departamento'
      else if (tipo.includes('local')) updates.tipoPropiedad = 'Local comercial'
      else if (tipo.includes('oficina')) updates.tipoPropiedad = 'Oficina'
    }

    // Country
    if (prop.neighborhood) {
      const nb = prop.neighborhood
      const matchedCountry = COUNTRIES.find((c) =>
        nb.toLowerCase().includes(c.toLowerCase().split(' ')[0])
      )
      if (matchedCountry) updates.country = matchedCountry
    }

    // Ubicación
    if (prop.neighborhood) updates.ubicacion = prop.neighborhood

    // Superficies
    if (prop.surface_covered) updates.m2Cubiertos = String(prop.surface_covered)
    if (prop.surface_total) updates.m2Terreno = String(prop.surface_total)

    // Precio
    if (prop.price) updates.precioPretendido = String(prop.price)

    onChange(updates)
    setImportedTitle(prop.title || 'Propiedad importada')
    setShowImport(false)
  }

  return (
    <div className="space-y-6">
      {showImport && (
        <ImportarModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Datos básicos de la propiedad</h2>
          <p className="text-sm text-gris font-montserrat">
            Ningún campo es obligatorio — completá lo que tenés disponible.
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="btn-secondary flex items-center gap-2 flex-shrink-0"
          title="Pre-completar desde tu cartera en Supabase"
        >
          <Database size={13} />
          Importar de cartera
        </button>
      </div>

      {/* Imported banner */}
      {importedTitle && (
        <div className="flex items-center gap-2 bg-verde-muted border border-verde-light rounded-lg px-3 py-2.5">
          <CheckCircle2 size={14} className="text-verde flex-shrink-0" />
          <p className="text-xs text-verde font-medium flex-1">
            Datos pre-completados desde: <span className="font-semibold">{importedTitle}</span>
          </p>
          <button
            onClick={() => setImportedTitle('')}
            className="text-verde/60 hover:text-verde transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tipo de propiedad */}
        <div>
          <label className="label">Tipo de propiedad</label>
          <div className="relative">
            <select
              className="select-field pr-8"
              value={form.tipoPropiedad}
              onChange={(e) => onChange({ tipoPropiedad: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {TIPOS_PROPIEDAD.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
          </div>
        </div>

        {/* Country / BC — solo si el tipo lo requiere */}
        {isCountryType(form.tipoPropiedad) && (
          <div>
            <label className="label">Country / Barrio cerrado</label>
            <div className="relative">
              <select
                className="select-field pr-8"
                value={form.country}
                onChange={(e) => onChange({ country: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
            </div>
          </div>
        )}

        {/* Ubicación */}
        <div className={clsx(!isCountryType(form.tipoPropiedad) && 'md:col-span-1')}>
          <label className="label">Ubicación / Barrio / Dirección</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej: Merlo, Moreno, Luján, etc."
            value={form.ubicacion}
            onChange={(e) => onChange({ ubicacion: e.target.value })}
          />
        </div>

        {/* M² cubiertos */}
        <div>
          <label className="label">M² cubiertos</label>
          <input
            type="number"
            className="input-field"
            placeholder="Ej: 180"
            value={form.m2Cubiertos}
            onChange={(e) => onChange({ m2Cubiertos: e.target.value })}
          />
        </div>

        {/* M² terreno */}
        <div>
          <label className="label">
            {form.tipoPropiedad.toLowerCase().includes('lote')
              ? 'M² del lote'
              : 'M² terreno / lote'}
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="Ej: 600"
            value={form.m2Terreno}
            onChange={(e) => onChange({ m2Terreno: e.target.value })}
          />
        </div>

        {/* Precio pretendido */}
        <div>
          <label className="label">Precio pretendido por el propietario (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gris text-sm font-medium">
              USD
            </span>
            <input
              type="number"
              className="input-field pl-12"
              placeholder="Ej: 250000"
              value={form.precioPretendido}
              onChange={(e) => onChange({ precioPretendido: e.target.value })}
            />
          </div>
          <p className="text-xs text-gris mt-1">
            Lo que pide el dueño — la IA calculará el desvío vs el valor de mercado
          </p>
        </div>

        {/* Urgencia */}
        <div>
          <label className="label">Urgencia de venta</label>
          <div className="flex flex-col gap-2">
            {URGENCIA_OPTIONS.map((u) => (
              <label
                key={u.value}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150',
                  form.urgenciaVenta === u.value
                    ? 'border-verde bg-verde-muted text-verde'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  className="accent-verde"
                  checked={form.urgenciaVenta === u.value}
                  onChange={() => onChange({ urgenciaVenta: u.value })}
                />
                <span className="text-sm font-montserrat">{u.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
