import type {
  TasacionForm,
  TasacionResult,
  ComparableSupabase,
  ComparableExternal,
  ComparableManual,
} from '../types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY as string
const BASE_URL = 'https://api.anthropic.com/v1/messages'

const COMMON_HEADERS = {
  'x-api-key': API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
  'content-type': 'application/json',
}

// ─── Vision: analyze photos ──────────────────────────────────────────────────
export async function analyzePhotos(
  photos: { dataUrl: string; mimeType: string }[]
): Promise<string> {
  if (photos.length === 0) return ''

  const imageContent = photos.slice(0, 6).map((p) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: p.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
      data: p.dataUrl.split(',')[1],
    },
  }))

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Sos un tasador inmobiliario experto de Zona Oeste GBA Argentina. Analizá estas fotos de la propiedad y describí en 3-5 oraciones:
1. Estado visual general (excelente/muy bueno/bueno/regular/a refaccionar)
2. Calidad constructiva aparente (estándar/buena/premium/de lujo)
3. Calidad de terminaciones visibles (pisos, aberturas, cocina, baño)
4. Puntos a favor y en contra para la tasación
5. Cualquier detalle relevante para valorizar o desvalorizar

Sé directo y técnico. Responde en español.`,
          },
        ],
      },
    ],
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error analizando fotos: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── Web search: find comparable properties in portals ───────────────────────
export async function searchPortales(form: TasacionForm): Promise<ComparableExternal[]> {
  const tipoDesc = form.country
    ? `${form.tipoPropiedad} en ${form.country}`
    : form.tipoPropiedad
  const zona = form.country || form.ubicacion || 'Zona Oeste GBA'
  const m2 = form.m2Cubiertos ? `${form.m2Cubiertos}m²` : ''
  const query = `propiedades en venta ${tipoDesc} ${zona} Zona Oeste GBA Argentina ${m2} precio USD zonaprop argenprop mercadolibre 2024 2025`

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      },
    ],
    system: `Sos un agente de búsqueda inmobiliaria para Zona Oeste GBA Argentina.
Tu tarea es buscar en portales inmobiliarios (Zonaprop, Argenprop, MercadoLibre Inmuebles) propiedades similares a las especificadas.
Devolvés ÚNICAMENTE un JSON array con los resultados encontrados. Sin texto adicional, sin markdown, sin explicaciones.
El JSON debe ser un array de objetos con estas claves exactas:
titulo, precio_usd, precio_ars, m2_cubiertos, m2_lote, ambientes, zona, estado, fuente, url_referencia
Los valores numéricos pueden ser null si no se encuentran. Incluí mínimo 3 y máximo 8 resultados.`,
    messages: [
      {
        role: 'user',
        content: `Buscá en portales inmobiliarios: ${query}

Zona: ${zona}
Tipo: ${tipoDesc}
M² cubiertos aprox: ${form.m2Cubiertos || 'no especificado'}
M² terreno aprox: ${form.m2Terreno || 'no especificado'}
Ambientes: ${form.ambientes || 'no especificado'}

Buscá en Zonaprop, Argenprop y MercadoLibre. Devolvé SOLO el JSON array, sin texto adicional.`,
      },
    ],
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      ...COMMON_HEADERS,
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error buscando en portales: ${err}`)
  }

  const data = await res.json()

  // Claude con web_search devuelve múltiples bloques: tool_use + tool_result + text
  // Tomamos el ÚLTIMO bloque de texto que tiene el JSON final
  const textBlocks: string[] = []
  for (const block of data.content ?? []) {
    if (block.type === 'text' && block.text) {
      textBlocks.push(block.text)
    }
  }
  const jsonText = textBlocks[textBlocks.length - 1] ?? ''

  // Intentar parsear el JSON array de la respuesta
  try {
    const match = jsonText.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Omit<ComparableExternal, 'id' | 'seleccionado'>[]
      return parsed.map((p, i) => ({ ...p, id: `portal-${i}`, seleccionado: false }))
    }
    // Si no hay array, intentar parsear directo
    const direct = JSON.parse(jsonText)
    if (Array.isArray(direct)) {
      return direct.map((p: Omit<ComparableExternal, 'id' | 'seleccionado'>, i: number) => ({
        ...p,
        id: `portal-${i}`,
        seleccionado: false,
      }))
    }
  } catch {
    console.warn('No se pudo parsear JSON de portales:', jsonText.slice(0, 200))
  }

  return []
}

// ─── Main valuation ───────────────────────────────────────────────────────────
export async function generateValuation(
  form: TasacionForm,
  comparablesSupabase: ComparableSupabase[],
  comparablesPortales: ComparableExternal[],
  comparablesManuales: ComparableManual[],
  analisisVisual: string
): Promise<TasacionResult> {
  const selectedSupabase = comparablesSupabase.filter((c) => c.seleccionado)
  const selectedPortales = comparablesPortales.filter((c) => c.seleccionado)
  const selectedManuales = comparablesManuales.filter((c) => c.seleccionado)

  const allComparables = [
    ...selectedSupabase.map((c) => ({
      fuente: 'Cartera propia',
      tipo: c.property_type,
      zona: c.neighborhood,
      precio: c.price ? `USD ${c.price.toLocaleString()}` : 'Sin precio',
      moneda: c.currency,
      m2_cubiertos: c.surface_covered,
      m2_total: c.surface_total,
      ambientes: c.bedrooms,
      estado: c.status,
      titulo: c.title,
    })),
    ...selectedPortales.map((c) => ({
      fuente: c.fuente,
      tipo: form.tipoPropiedad,
      zona: c.zona,
      precio: c.precio_usd ? `USD ${c.precio_usd.toLocaleString()}` : c.precio_ars ? `ARS ${c.precio_ars.toLocaleString()}` : 'Sin precio',
      m2_cubiertos: c.m2_cubiertos,
      m2_lote: c.m2_lote,
      ambientes: c.ambientes,
      estado: c.estado,
      titulo: c.titulo,
      url: c.url_referencia,
    })),
    ...selectedManuales.map((c) => ({
      fuente: c.fuente || 'Manual',
      zona: c.zona,
      precio: c.precio,
      m2: c.m2,
      descripcion: c.descripcion,
    })),
  ]

  const contextStr = `
DATOS DE LA PROPIEDAD A TASAR:
- Tipo: ${form.tipoPropiedad}
- Country/Barrio cerrado: ${form.country || 'N/A'}
- Ubicación/Zona: ${form.ubicacion || 'No especificada'}
- M² cubiertos: ${form.m2Cubiertos || 'No especificado'}
- M² terreno/lote: ${form.m2Terreno || 'No especificado'}
- Ambientes: ${form.ambientes || 'No especificado'}
- Baños: ${form.banos || 'No especificado'}
- Cocheras: ${form.cocheras || 'No especificado'}
- Antigüedad: ${form.antiguedad || 'No especificada'}
- Estado general: ${form.estadoGeneral || 'No especificado'}
- Calidad constructiva: ${form.calidadConstructiva || 'No especificada'}
- Orientación: ${form.orientacion || 'No especificada'}
- Vista: ${form.vista || 'No especificada'}
- Situación legal: ${form.situacionLegal || 'No especificada'}
- Ocupación: ${form.ocupacion || 'No especificada'}
- Urgencia de venta: ${form.urgenciaVenta || 'Media'}
- Precio pretendido por el propietario: ${form.precioPretendido ? `USD ${parseFloat(form.precioPretendido).toLocaleString()}` : 'No indicado'}
- Video link: ${form.videoLink || 'N/A'}
- Observaciones del corredor: ${form.observaciones || 'Sin observaciones'}

ANÁLISIS VISUAL DE FOTOS (${form.fotos.length} fotos):
${analisisVisual || 'Sin fotos disponibles'}

COMPARABLES SELECCIONADOS (${allComparables.length} total):
${allComparables.length > 0 ? JSON.stringify(allComparables, null, 2) : 'Sin comparables seleccionados — usar criterio de mercado general'}

CANTIDAD POR FUENTE:
- Cartera propia: ${selectedSupabase.length}
- Portales externos: ${selectedPortales.length}
- Carga manual: ${selectedManuales.length}
`

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `Sos el agente tasador interno de CALDERÓN PROPIEDADES, matrícula N° 227, Zona Oeste GBA. Trabajás en USD. Tipologías: countries/BC (San Patricio, San Diego CC, Campos de Álvarez, Terravista, La Cesarina, Álvarez del Bosque, Solar de Álvarez, Country Banco Provincia), casas, departamentos, lotes. En countries la diferencia entre calidad estándar y premium puede ser USD 40.000-60.000 en los mismos m². Metodología: calcular valor/m² de cada comparable, aplicar ajustes por ubicación/estado/calidad/antigüedad/liquidez, generar rango conservador/probable/optimista, estimar precio de cierre con margen 5-12% (hasta 15% en countries), detectar desvío vs precio del propietario, calcular confianza. Reglas: nunca inventar comparables, siempre distinguir precio de publicación de precio de cierre, ser conservador en baja liquidez. Responder SOLO con JSON válido sin markdown ni texto adicional: {"rango_conservador": number, "rango_probable": number, "rango_optimista": number, "cierre_min": number, "cierre_max": number, "margen_negociacion": number, "confianza_pct": number, "confianza_nivel": "Baja"|"Media"|"Alta"|"Muy alta", "confianza_nota": string, "desvio_pct": number, "desvio_signo": "neutral"|"sobrevaluado"|"subvaluado", "variables_suben": string[], "variables_bajan": string[], "variables_alerta": string[], "recomendacion": string, "recomendacion_titulo": string, "recomendacion_desc": string, "justificacion": string, "observaciones_internas": string, "requiere_visita": boolean, "requiere_visita_motivo": string}`,
    messages: [
      {
        role: 'user',
        content: contextStr,
      },
    ],
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error generando tasación: ${err}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0]) as TasacionResult
    }
    return JSON.parse(text) as TasacionResult
  } catch {
    throw new Error('Error parseando respuesta de Claude: ' + text)
  }
}
