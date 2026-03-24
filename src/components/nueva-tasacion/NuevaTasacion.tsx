import { useState } from 'react'
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Check } from 'lucide-react'
import clsx from 'clsx'
import type { TasacionForm, TasacionResult } from '../../types'
import Step1Basicos from './Step1Basicos'
import Step2Caracteristicas from './Step2Caracteristicas'
import Step3Comparables from './Step3Comparables'
import Resultados from '../resultados/Resultados'
import { analyzePhotos, generateValuation } from '../../lib/claude'
import { saveHistorial } from '../../lib/storage'

const INITIAL_FORM: TasacionForm = {
  tipoPropiedad: '',
  country: '',
  ubicacion: '',
  m2Cubiertos: '',
  m2Terreno: '',
  precioPretendido: '',
  urgenciaVenta: 'media',
  ambientes: '0',
  banos: '0',
  cocheras: '0',
  antiguedad: '',
  estadoGeneral: '',
  calidadConstructiva: '',
  orientacion: '',
  vista: '',
  situacionLegal: '',
  ocupacion: '',
  observaciones: '',
  fotos: [],
  videoLink: '',
  comparablesSupabase: [],
  comparablesPortales: [],
  comparablesManuales: [],
}

const STEPS = [
  { id: 1, label: 'Datos básicos' },
  { id: 2, label: 'Características' },
  { id: 3, label: 'Comparables' },
]

type GenerationStatus =
  | 'idle'
  | 'analyzing_photos'
  | 'generating'
  | 'done'
  | 'error'

export default function NuevaTasacion() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<TasacionForm>(INITIAL_FORM)
  const [result, setResult] = useState<TasacionResult | null>(null)
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [analisisVisual, setAnalisisVisual] = useState('')

  const updateForm = (updates: Partial<TasacionForm>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const handleGenerate = async () => {
    setError('')
    setStatus('idle')

    try {
      let visualAnalysis = ''

      // Step 1: analyze photos if available
      if (form.fotos.length > 0) {
        setStatus('analyzing_photos')
        setStatusMsg(`Analizando ${form.fotos.length} foto${form.fotos.length > 1 ? 's' : ''} con IA...`)
        visualAnalysis = await analyzePhotos(
          form.fotos.map((f) => ({ dataUrl: f.dataUrl, mimeType: f.mimeType }))
        )
        setAnalisisVisual(visualAnalysis)
      }

      // Step 2: generate valuation
      setStatus('generating')
      setStatusMsg('Generando tasación con IA...')

      const tasacion = await generateValuation(
        form,
        form.comparablesSupabase,
        form.comparablesPortales,
        form.comparablesManuales,
        visualAnalysis
      )

      // Attach visual analysis to result
      tasacion.analisis_visual = visualAnalysis

      setResult(tasacion)
      setStatus('done')

      // Save to history
      saveHistorial({
        id: `tasacion-${Date.now()}`,
        fecha: new Date().toISOString(),
        tipoPropiedad: form.tipoPropiedad || 'Propiedad',
        ubicacion: form.ubicacion || '',
        country: form.country || '',
        rangoProbable: tasacion.rango_probable,
        confianza: tasacion.confianza_pct,
        confianzaNivel: tasacion.confianza_nivel,
        desvio: tasacion.desvio_pct,
        desvioSigno: tasacion.desvio_signo,
        form,
        result: tasacion,
      })
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Error desconocido al generar la tasación')
    }
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setStep(1)
    setResult(null)
    setStatus('idle')
    setError('')
    setAnalisisVisual('')
  }

  // Show results
  if (result && status === 'done') {
    return (
      <Resultados
        result={result}
        form={form}
        comparablesSupabaseCount={form.comparablesSupabase.filter((c) => c.seleccionado).length}
        comparablesPortalesCount={form.comparablesPortales.filter((c) => c.seleccionado).length}
        comparablesManualesCount={form.comparablesManuales.filter((c) => c.seleccionado).length}
        onNuevaTasacion={handleReset}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <ProgressBar currentStep={step} steps={STEPS} />

      {/* Step content */}
      <div className="card">
        {step === 1 && <Step1Basicos form={form} onChange={updateForm} />}
        {step === 2 && <Step2Caracteristicas form={form} onChange={updateForm} />}
        {step === 3 && <Step3Comparables form={form} onChange={updateForm} />}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="btn-ghost flex items-center gap-2 disabled:opacity-0"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary flex items-center gap-2"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        ) : (
          <GenerateButton status={status} statusMsg={statusMsg} onClick={handleGenerate} />
        )}
      </div>

      {/* Generating status overlay */}
      {(status === 'analyzing_photos' || status === 'generating') && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-verde-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-verde animate-pulse" size={28} />
            </div>
            <h3 className="font-cormorant text-2xl font-semibold text-gray-800 mb-2">
              {status === 'analyzing_photos' ? 'Analizando fotos...' : 'Tasando con IA...'}
            </h3>
            <p className="text-sm text-gris">{statusMsg}</p>
            <div className="mt-4 flex justify-center">
              <Loader2 className="animate-spin text-verde" size={24} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({
  currentStep,
  steps,
}: {
  currentStep: number
  steps: { id: number; label: string }[]
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                'font-montserrat transition-all duration-300',
                currentStep > s.id
                  ? 'bg-verde text-white'
                  : currentStep === s.id
                  ? 'bg-verde text-white ring-4 ring-verde-light'
                  : 'bg-white border-2 border-gray-200 text-gris'
              )}
            >
              {currentStep > s.id ? <Check size={14} /> : s.id}
            </div>
            <span
              className={clsx(
                'text-[11px] font-montserrat mt-1.5 whitespace-nowrap',
                currentStep === s.id ? 'text-verde font-semibold' : 'text-gris'
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={clsx(
                'flex-1 h-0.5 mx-2 mb-5 transition-all duration-300',
                currentStep > s.id ? 'bg-verde' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Generate button ──────────────────────────────────────────────────────────
function GenerateButton({
  status,
  statusMsg,
  onClick,
}: {
  status: GenerationStatus
  statusMsg: string
  onClick: () => void
}) {
  const isLoading = status === 'analyzing_photos' || status === 'generating'

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {statusMsg || 'Procesando...'}
        </>
      ) : (
        <>
          <Sparkles size={16} />
          Generar tasación con IA
        </>
      )}
    </button>
  )
}
