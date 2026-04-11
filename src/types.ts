// ─── Supabase property from DB ───────────────────────────────────────────────
export interface SupabaseProperty {
  id: string
  title: string
  operation_type: string
  property_type: string
  neighborhood: string
  price: number | null
  currency: string | null
  surface_total: number | null
  surface_covered: number | null
  bedrooms: number | null
  bathrooms: number | null
  garages: number | null
  status: string
  short_description: string | null
  description: string | null
}

// ─── Comparable from portals (external) ─────────────────────────────────────
export interface ComparableExternal {
  id: string
  titulo: string
  precio_usd: number | null
  precio_ars: number | null
  m2_cubiertos: number | null
  m2_lote: number | null
  ambientes: number | null
  zona: string
  estado: string
  fuente: string
  url_referencia: string
  seleccionado: boolean
}

// ─── Comparable from Supabase (with similarity score) ────────────────────────
export interface ComparableSupabase extends SupabaseProperty {
  score: number
  seleccionado: boolean
}

// ─── Comparable added manually ────────────────────────────────────────────────
export interface ComparableManual {
  id: string
  descripcion: string
  precio: string
  m2: string
  zona: string
  fuente: string
  seleccionado: boolean
}

// ─── Uploaded file (image / video / pdf) ────────────────────────────────────
export interface PhotoFile {
  id: string
  name: string
  dataUrl: string      // base64 dataURL for images/PDFs; blob URL for videos
  mimeType: string
  tipo?: 'imagen' | 'video' | 'pdf'   // undefined = imagen (backward compat)
  size?: number        // bytes
}

// ─── Main form state ──────────────────────────────────────────────────────────
export interface TasacionForm {
  // Step 1
  tipoPropiedad: string
  country: string
  ubicacion: string
  m2Cubiertos: string
  m2Terreno: string
  precioPretendido: string
  urgenciaVenta: string

  // Step 2
  ambientes: string
  dormitorios: string
  banos: string
  cocheras: string
  antiguedad: string
  estadoGeneral: string
  calidadConstructiva: string
  orientacion: string
  vista: string
  situacionLegal: string
  ocupacion: string
  observaciones: string
  fotos: PhotoFile[]
  videoLink: string

  // Step 3
  comparablesSupabase: ComparableSupabase[]
  comparablesPortales: ComparableExternal[]
  comparablesManuales: ComparableManual[]
}

// ─── Comparable analizado por la IA ──────────────────────────────────────────
export interface ComparableAnalizado {
  titulo: string
  fuente: string
  precio_publicacion: number | null
  m2: number | null
  valor_m2: number | null
  ajuste_pct: number
  ajuste_motivos: string
  valor_m2_ajustado: number | null
  incluido: boolean
  motivo_inclusion: string
}

// ─── Ajuste aplicado a la tasación ───────────────────────────────────────────
export interface AjusteAplicado {
  concepto: string
  impacto_pct: number
  descripcion: string
}

// ─── AI Valuation result ─────────────────────────────────────────────────────
export interface TasacionResult {
  // Rangos y cierre
  rango_conservador: number
  rango_probable: number
  rango_optimista: number
  cierre_min: number
  cierre_max: number
  margen_negociacion: number

  // Valor/m²
  valor_m2_mercado: number
  valor_m2_propiedad: number

  // Confianza
  confianza_pct: number
  confianza_nivel: 'Baja' | 'Media' | 'Alta' | 'Muy alta'
  confianza_nota: string

  // Desvío vs precio pretendido
  desvio_pct: number
  desvio_signo: 'neutral' | 'sobrevaluado' | 'subvaluado'

  // Metodología detallada
  comparables_analizados: ComparableAnalizado[]
  ajustes_aplicados: AjusteAplicado[]
  metodologia: string
  calculo_paso_a_paso: string

  // Variables
  variables_suben: string[]
  variables_bajan: string[]
  variables_alerta: string[]

  // Recomendación y textos
  recomendacion: string
  recomendacion_titulo: string
  recomendacion_desc: string
  justificacion: string
  observaciones_internas: string
  requiere_visita: boolean
  requiere_visita_motivo: string

  // Añadido client-side
  analisis_visual?: string
}

// ─── Cierre registrado post-tasación ─────────────────────────────────────────
export interface CierrePropiedad {
  precio: number
  fecha: string
  diasEnMercado?: number
  notas?: string
}

// ─── Historial entry ─────────────────────────────────────────────────────────
export interface HistorialEntry {
  id: string
  fecha: string
  tipoPropiedad: string
  ubicacion: string
  country: string
  rangoProbable: number
  confianza: number
  confianzaNivel: string
  desvio: number
  desvioSigno: string
  form: TasacionForm
  result: TasacionResult
  cierre?: CierrePropiedad
}

export const COUNTRIES = [
  'San Patricio',
  'San Diego CC',
  'Campos de Álvarez',
  'Terravista',
  'La Cesarina',
  'Álvarez del Bosque',
  'Solar de Álvarez',
  'Country Banco Provincia',
]

export const TIPOS_PROPIEDAD = [
  'Casa en country/BC',
  'Lote en country/BC',
  'Casa',
  'Departamento',
  'Lote',
  'Local comercial',
  'Oficina',
]

export const URGENCIA_OPTIONS = [
  { value: 'alta', label: 'Alta — necesita vender rápido' },
  { value: 'media', label: 'Media — flexible en tiempos' },
  { value: 'baja', label: 'Baja — espera el precio justo' },
]

export const CALIDAD_OPTIONS = ['Estándar', 'Buena', 'Premium', 'De lujo']

export const ESTADO_OPTIONS = [
  'Excelente',
  'Muy bueno',
  'Bueno',
  'Regular',
  'A refaccionar',
]

export const ORIENTACION_OPTIONS = ['Norte', 'Sur', 'Este', 'Oeste', 'NE', 'NO', 'SE', 'SO']

export const SITUACION_LEGAL_OPTIONS = [
  'Escriturada',
  'Boleto de compraventa',
  'Sucesión',
  'Hipotecada',
  'Otro',
]

export const OCUPACION_OPTIONS = [
  'Desocupada',
  'Ocupada por dueño',
  'Alquilada',
  'Ocupada por terceros',
]
