import { ChevronDown } from 'lucide-react'
import type { TasacionForm } from '../../types'
import { TIPOS_PROPIEDAD, COUNTRIES, URGENCIA_OPTIONS } from '../../types'
import clsx from 'clsx'

interface Props {
  form: TasacionForm
  onChange: (updates: Partial<TasacionForm>) => void
}

const isCountryType = (tipo: string) =>
  tipo.toLowerCase().includes('country') || tipo.toLowerCase().includes('bc')

export default function Step1Basicos({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Datos básicos de la propiedad</h2>
        <p className="text-sm text-gris font-montserrat">
          Ningún campo es obligatorio — completá lo que tenés disponible.
        </p>
      </div>

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
