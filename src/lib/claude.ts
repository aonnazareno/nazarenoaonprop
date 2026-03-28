import type {
  TasacionForm,
  TasacionResult,
  ComparableSupabase,
  ComparableExternal,
  ComparableManual,
} from '../types'
import { getSettings } from './storage'

const BASE_URL = 'https://api.anthropic.com/v1/messages'

function getCommonHeaders() {
  return {
    'x-api-key': getSettings().anthropicKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'content-type': 'application/json',
  }
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
            text: `Sos un tasador inmobiliario experto de Zona Oeste GBA Argentina. Analizá estas fotos y describí:
1. Estado visual general (excelente/muy bueno/bueno/regular/a refaccionar)
2. Calidad constructiva aparente (estándar/buena/premium/de lujo)
3. Terminaciones visibles: pisos, aberturas, cocina, baños, carpintería
4. Puntos concretos que SUMAN valor (con estimación de impacto en %)
5. Puntos concretos que RESTAN valor (con estimación de impacto en %)
6. Conclusión: cómo afectan estas fotos al valor de tasación

Sé técnico y específico. Respondé en español.`,
          },
        ],
      },
    ],
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getCommonHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Error analizando fotos: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── Web search: precio/m² de mercado + listings comparables ─────────────────
export async function searchPortales(form: TasacionForm): Promise<ComparableExternal[]> {
  const tipoDesc = form.country
    ? `${form.tipoPropiedad} en ${form.country}`
    : form.tipoPropiedad
  const zona = form.country || form.ubicacion || 'Zona Oeste GBA'
  const m2Info = form.m2Cubiertos ? `, ${form.m2Cubiertos}m² cubiertos` : ''
  const ambInfo = form.ambientes && form.ambientes !== '0' ? `, ${form.ambientes} ambientes` : ''

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      },
    ],
    system: `Sos un investigador de mercado inmobiliario para Zona Oeste GBA Argentina especializado en tasaciones.
Tu objetivo es buscar en portales inmobiliarios (Zonaprop, Argenprop, MercadoLibre Inmuebles) dos cosas:
1. El precio promedio por m² en la zona para el tipo de propiedad indicado
2. Propiedades en venta similares a las especificadas

Devolvés ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional ni markdown:
{
  "precio_m2_zona": número o null,
  "fuente_precio_m2": "de dónde obtuviste ese dato",
  "nota_mercado": "contexto breve del mercado en esa zona",
  "comparables": [
    {
      "titulo": string,
      "precio_usd": número o null,
      "precio_ars": número o null,
      "m2_cubiertos": número o null,
      "m2_lote": número o null,
      "ambientes": número o null,
      "zona": string,
      "estado": string,
      "fuente": "Zonaprop"|"Argenprop"|"MercadoLibre"|otro,
      "url_referencia": string
    }
  ]
}
Incluí entre 4 y 8 comparables. Los valores numéricos pueden ser null si no están disponibles.`,
    messages: [
      {
        role: 'user',
        content: `Necesito datos de mercado para tasar: ${tipoDesc}
Zona: ${zona}
Características: ${m2Info}${ambInfo}
Antigüedad aprox: ${form.antiguedad ? form.antiguedad + ' años' : 'no especificada'}
Estado: ${form.estadoGeneral || 'no especificado'}

Buscá:
1. Precio promedio por m² para ${tipoDesc} en ${zona} hoy (2025)
2. Propiedades en venta similares en Zonaprop, Argenprop y MercadoLibre

Devolvé SOLO el JSON, sin texto adicional.`,
      },
    ],
  }

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      ...getCommonHeaders(),
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Error buscando en portales: ${await res.text()}`)

  const data = await res.json()

  // Tomar el último bloque de texto (Claude con web_search escribe el JSON al final)
  const textBlocks: string[] = []
  for (const block of data.content ?? []) {
    if (block.type === 'text' && block.text) textBlocks.push(block.text)
  }
  const jsonText = textBlocks[textBlocks.length - 1] ?? ''

  try {
    const match = jsonText.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        precio_m2_zona?: number | null
        fuente_precio_m2?: string
        nota_mercado?: string
        comparables?: Omit<ComparableExternal, 'id' | 'seleccionado'>[]
      }

      // Guardar datos de mercado para uso en el prompt de tasación
      if (parsed.precio_m2_zona) {
        sessionStorage.setItem(
          'mercado_zona',
          JSON.stringify({
            precio_m2: parsed.precio_m2_zona,
            fuente: parsed.fuente_precio_m2,
            nota: parsed.nota_mercado,
          })
        )
      }

      return (parsed.comparables ?? []).map((p, i) => ({
        ...p,
        id: `portal-${i}`,
        seleccionado: false,
      }))
    }
  } catch {
    console.warn('No se pudo parsear respuesta de portales:', jsonText.slice(0, 300))
  }

  return []
}

// ─── System prompt principal ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos el tasador experto interno de CALDERÓN PROPIEDADES, matrícula N° 227, Zona Oeste GBA Argentina.

ESPECIALIDAD: Countries y barrios cerrados (San Patricio, San Diego CC, Campos de Álvarez, Terravista, La Cesarina, Álvarez del Bosque, Solar de Álvarez, Country Banco Provincia), casas, departamentos y lotes en Zona Oeste GBA.

METODOLOGÍA OBLIGATORIA — seguí estos pasos en orden:
1. Calculá el valor por m² de CADA comparable disponible (precio / m² cubiertos)
2. Evaluá la comparabilidad de cada uno: ¿qué tan similar es a la propiedad en cuestión? Explicá por qué lo incluís o excluís
3. Aplicá ajustes a cada comparable por: zona exacta, calidad constructiva, estado, antigüedad, orientación, vista, situación legal, liquidez del mercado
4. Calculá el valor/m² promedio ponderado de los comparables válidos
5. Multiplicá por los m² de la propiedad para obtener el valor base
6. Aplicá ajustes globales finales (urgencia, mercado, calidad especial, etc.)
7. Generá el rango conservador/probable/optimista y el precio de cierre
8. Calculá el desvío vs precio pretendido del propietario
9. Determiná la confianza según cantidad y calidad de los comparables

REGLAS CRÍTICAS:
- Nunca inventés comparables — trabajá solo con los provistos
- Si no hay comparables suficientes, bajá la confianza y usá criterio de mercado general
- Siempre distinguí precio de publicación vs precio de cierre (descuento típico 5-12%, hasta 15% en countries premium)
- En countries: la diferencia estándar ↔ premium puede ser USD 40.000-60.000 en los mismos m²
- Sé conservador en baja liquidez
- Mostrá TODO el razonamiento — el corredor necesita explicarle al propietario cómo llegaste al número

FORMATO DE RESPUESTA: Respondé ÚNICAMENTE con el objeto JSON. Tu respuesta debe empezar con el carácter { y terminar con }. Sin markdown, sin \`\`\`, sin texto antes ni después.`

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

  // Recuperar datos de mercado guardados por searchPortales
  let mercadoZona = ''
  try {
    const raw = sessionStorage.getItem('mercado_zona')
    if (raw) {
      const m = JSON.parse(raw) as { precio_m2: number; fuente: string; nota: string }
      mercadoZona = `
DATO DE MERCADO (precio/m² zona obtenido de portales):
- Precio/m² promedio de mercado en la zona: USD ${m.precio_m2.toLocaleString('es-AR')}
- Fuente: ${m.fuente}
- Contexto: ${m.nota}`
    }
  } catch { /* ignore */ }

  const allComparables = [
    ...selectedSupabase.map((c) => ({
      fuente: 'Cartera propia (Calderón Propiedades)',
      tipo: c.property_type,
      zona: c.neighborhood,
      titulo: c.title,
      precio_publicacion: c.price,
      moneda: c.currency ?? 'USD',
      m2_cubiertos: c.surface_covered,
      m2_total: c.surface_total,
      valor_m2_publicacion: c.price && c.surface_covered ? Math.round(c.price / c.surface_covered) : null,
      ambientes: c.bedrooms,
      banos: c.bathrooms,
      cocheras: c.garages,
      estado_db: c.status,
      descripcion: c.short_description,
    })),
    ...selectedPortales.map((c) => ({
      fuente: c.fuente,
      zona: c.zona,
      titulo: c.titulo,
      precio_publicacion_usd: c.precio_usd,
      precio_publicacion_ars: c.precio_ars,
      valor_m2_publicacion: c.precio_usd && c.m2_cubiertos ? Math.round(c.precio_usd / c.m2_cubiertos) : null,
      m2_cubiertos: c.m2_cubiertos,
      m2_lote: c.m2_lote,
      ambientes: c.ambientes,
      estado: c.estado,
      url: c.url_referencia,
    })),
    ...selectedManuales.map((c) => ({
      fuente: c.fuente || 'Carga manual',
      zona: c.zona,
      precio_texto: c.precio,
      m2_texto: c.m2,
      descripcion: c.descripcion,
    })),
  ]

  const contextStr = `
PROPIEDAD A TASAR:
- Tipo: ${form.tipoPropiedad}
- Country/BC: ${form.country || 'N/A'}
- Ubicación: ${form.ubicacion || 'No especificada'}
- M² cubiertos: ${form.m2Cubiertos || 'No especificado'}
- M² terreno/lote: ${form.m2Terreno || 'No especificado'}
- Ambientes: ${form.ambientes || 'No especificado'}
- Baños: ${form.banos || 'No especificado'}
- Cocheras: ${form.cocheras || 'No especificado'}
- Antigüedad: ${form.antiguedad ? form.antiguedad + ' años' : 'No especificada'}
- Estado general: ${form.estadoGeneral || 'No especificado'}
- Calidad constructiva: ${form.calidadConstructiva || 'No especificada'}
- Orientación: ${form.orientacion || 'No especificada'}
- Vista: ${form.vista || 'No especificada'}
- Situación legal: ${form.situacionLegal || 'No especificada'}
- Ocupación: ${form.ocupacion || 'No especificada'}
- Urgencia de venta: ${form.urgenciaVenta || 'Media'}
- Precio pretendido por el propietario: ${form.precioPretendido ? `USD ${parseFloat(form.precioPretendido).toLocaleString('es-AR')}` : 'No indicado'}
- Observaciones del corredor: ${form.observaciones || 'Sin observaciones'}
${mercadoZona}

ANÁLISIS VISUAL DE FOTOS (${form.fotos.length} fotos):
${analisisVisual ? analisisVisual.slice(0, 600) : 'Sin fotos'}

COMPARABLES DISPONIBLES (${allComparables.length} total):
- De cartera propia: ${selectedSupabase.length}
- De portales externos: ${selectedPortales.length}
- Carga manual: ${selectedManuales.length}

${allComparables.length > 0 ? JSON.stringify(allComparables) : 'Sin comparables — usá criterio de mercado general y bajá la confianza'}

INSTRUCCIÓN FINAL:
Analizá cada comparable, mostrá el cálculo de valor/m², los ajustes, y explicá cómo llegás al rango de tasación.

SCHEMA JSON requerido (devolvé exactamente estos campos):
{"rango_conservador":number,"rango_probable":number,"rango_optimista":number,"cierre_min":number,"cierre_max":number,"margen_negociacion":number,"valor_m2_mercado":number,"valor_m2_propiedad":number,"confianza_pct":number,"confianza_nivel":"Baja"|"Media"|"Alta"|"Muy alta","confianza_nota":string,"desvio_pct":number,"desvio_signo":"neutral"|"sobrevaluado"|"subvaluado","comparables_analizados":[{"titulo":string,"fuente":string,"precio_publicacion":number|null,"m2":number|null,"valor_m2":number|null,"ajuste_pct":number,"ajuste_motivos":string,"valor_m2_ajustado":number|null,"incluido":boolean,"motivo_inclusion":string}],"ajustes_aplicados":[{"concepto":string,"impacto_pct":number,"descripcion":string}],"metodologia":string,"calculo_paso_a_paso":string,"variables_suben":string[],"variables_bajan":string[],"variables_alerta":string[],"recomendacion":string,"recomendacion_titulo":string,"recomendacion_desc":string,"justificacion":string,"observaciones_internas":string,"requiere_visita":boolean,"requiere_visita_motivo":string}`

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getCommonHeaders(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextStr }],
    }),
  })

  if (!res.ok) throw new Error(`Error generando tasación: ${await res.text()}`)

  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Error parseando respuesta de Claude: ' + text.slice(0, 500))
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as TasacionResult
  } catch {
    throw new Error('Error parseando respuesta de Claude: ' + text.slice(0, 500))
  }
}
