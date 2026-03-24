import { useRef, useState } from 'react'
import { Upload, X, Link, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { TasacionForm, PhotoFile } from '../../types'
import {
  CALIDAD_OPTIONS,
  ESTADO_OPTIONS,
  ORIENTACION_OPTIONS,
  SITUACION_LEGAL_OPTIONS,
  OCUPACION_OPTIONS,
} from '../../types'

interface Props {
  form: TasacionForm
  onChange: (updates: Partial<TasacionForm>) => void
}

function NumberStepper({
  value,
  onChange,
  max = 20,
}: {
  value: string
  onChange: (v: string) => void
  max?: number
}) {
  const n = parseInt(value || '0')
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                   text-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium font-montserrat">
        {value || '0'}
      </span>
      <button
        type="button"
        onClick={() => onChange(String(Math.min(max, n + 1)))}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
                   text-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        +
      </button>
    </div>
  )
}

export default function Step2Caracteristicas({ form, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = (files: FileList | null) => {
    if (!files) return
    const validFiles = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const photo: PhotoFile = {
          id: `photo-${Date.now()}-${Math.random()}`,
          name: file.name,
          dataUrl: e.target?.result as string,
          mimeType: file.type,
        }
        onChange({ fotos: [...form.fotos, photo] })
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (id: string) => {
    onChange({ fotos: form.fotos.filter((f) => f.id !== id) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Características de la propiedad</h2>
        <p className="text-sm text-gris font-montserrat">
          Completá los detalles que tenés — la IA considerará cada dato disponible.
        </p>
      </div>

      {/* Ambientes / Baños / Cocheras */}
      <div className="card">
        <h3 className="font-cormorant text-lg font-semibold mb-4">Distribución</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="label">Ambientes</label>
            <NumberStepper value={form.ambientes} onChange={(v) => onChange({ ambientes: v })} />
          </div>
          <div>
            <label className="label">Baños</label>
            <NumberStepper value={form.banos} onChange={(v) => onChange({ banos: v })} />
          </div>
          <div>
            <label className="label">Cocheras</label>
            <NumberStepper value={form.cocheras} onChange={(v) => onChange({ cocheras: v })} max={10} />
          </div>
        </div>
      </div>

      {/* Estado y calidad */}
      <div className="card">
        <h3 className="font-cormorant text-lg font-semibold mb-4">Estado y calidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Antigüedad (años)</label>
            <input
              type="number"
              className="input-field"
              placeholder="Ej: 10"
              value={form.antiguedad}
              onChange={(e) => onChange({ antiguedad: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Estado general</label>
            <div className="relative">
              <select
                className="select-field pr-8"
                value={form.estadoGeneral}
                onChange={(e) => onChange({ estadoGeneral: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {ESTADO_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
            </div>
          </div>

          {/* Calidad constructiva — botones */}
          <div className="md:col-span-2">
            <label className="label">Calidad constructiva</label>
            <div className="flex flex-wrap gap-2">
              {CALIDAD_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ calidadConstructiva: c })}
                  className={clsx(
                    'px-4 py-2 rounded-lg border text-sm font-medium font-montserrat transition-all duration-150',
                    form.calidadConstructiva === c
                      ? 'bg-verde text-white border-verde'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-verde hover:text-verde'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extras */}
      <div className="card">
        <h3 className="font-cormorant text-lg font-semibold mb-4">Detalles adicionales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Orientación</label>
            <div className="relative">
              <select
                className="select-field pr-8"
                value={form.orientacion}
                onChange={(e) => onChange({ orientacion: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {ORIENTACION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Vista</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: al lago, al golf, al parque..."
              value={form.vista}
              onChange={(e) => onChange({ vista: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Situación legal</label>
            <div className="relative">
              <select
                className="select-field pr-8"
                value={form.situacionLegal}
                onChange={(e) => onChange({ situacionLegal: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {SITUACION_LEGAL_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Ocupación</label>
            <div className="relative">
              <select
                className="select-field pr-8"
                value={form.ocupacion}
                onChange={(e) => onChange({ ocupacion: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {OCUPACION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones del corredor */}
      <div className="card">
        <label className="label">Observaciones del corredor</label>
        <textarea
          className="input-field min-h-[120px] resize-y"
          placeholder="Notas relevantes sobre la propiedad, el propietario, situaciones especiales, etc."
          value={form.observaciones}
          onChange={(e) => onChange({ observaciones: e.target.value })}
        />
      </div>

      {/* Fotos */}
      <div className="card">
        <h3 className="font-cormorant text-lg font-semibold mb-1">Fotos de la propiedad</h3>
        <p className="text-xs text-gris mb-4">
          La IA analiza las fotos para detectar estado, calidad y terminaciones. JPG / PNG / WEBP.
        </p>

        {/* Dropzone */}
        <div
          className={clsx('dropzone', isDragging && 'active')}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            processFiles(e.dataTransfer.files)
          }}
        >
          <Upload size={24} className="mx-auto mb-2 text-gris" />
          <p className="text-sm font-medium text-gray-600">
            Arrastrá fotos acá o hacé click para seleccionar
          </p>
          <p className="text-xs text-gris mt-1">Máximo 6 fotos recomendadas</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
        </div>

        {/* Preview grid */}
        {form.fotos.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
            {form.fotos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                <img
                  src={photo.dataUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                             flex items-center justify-center opacity-0 group-hover:opacity-100
                             transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video link */}
      <div className="card">
        <label className="label">Link de video (Drive / YouTube)</label>
        <div className="relative">
          <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
          <input
            type="url"
            className="input-field pl-9"
            placeholder="https://drive.google.com/... o https://youtube.com/..."
            value={form.videoLink}
            onChange={(e) => onChange({ videoLink: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
