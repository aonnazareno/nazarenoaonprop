/**
 * Script para importar propiedades desde el feed XML de Adinco a Supabase.
 *
 * Uso: node scripts/import-adinco.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { XMLParser } from 'fast-xml-parser'

const ADINCO_URL = 'https://feeds.adinco.net/17198/ar_adinco.xml'
const SUPABASE_URL = 'https://btvqlinzgqjltvebkzez.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dnFsaW56Z3FqbHR2ZWJremV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODQ4NjQsImV4cCI6MjA4NzM2MDg2NH0.9HMCP-maADpLgAl-jQcYUaUw2SSxL409BEzK_bPab6M'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- Mapeo de campos Adinco → Supabase ---
// Adinco puede usar distintos nombres de tags. Ajustá si es necesario.
function mapAdincoToProperty(item) {
  // ID: Adinco usa <ID> o <Id> o <id>
  const id = String(item.ID ?? item.Id ?? item.id ?? '')

  // Título
  const title = item.Titulo ?? item.titulo ?? item.Title ?? ''

  // Operación: "Venta" → "venta", "Alquiler" → "alquiler"
  const opRaw = item.TipoOperacion ?? item.Operacion ?? item.operacion ?? ''
  const operation_type = opRaw.toString().toLowerCase().includes('alquiler') ? 'alquiler' : 'venta'

  // Tipo de propiedad
  const property_type = item.TipoPropiedad ?? item.Tipo ?? item.tipo ?? ''

  // Barrio / zona
  const neighborhood = item.Barrio ?? item.barrio ?? item.Zona ?? item.zona ?? item.Localidad ?? ''

  // Precio y moneda
  const price = parseFloat(item.Precio ?? item.precio ?? 0) || null
  const monedaRaw = item.Moneda ?? item.moneda ?? 'USD'
  const currency = monedaRaw.toString().toUpperCase().includes('PESO') ? 'ARS' : 'USD'

  // Superficies
  const surface_total = parseFloat(item.SuperficieTotal ?? item.superficieTotal ?? item.Superficie ?? 0) || null
  const surface_covered = parseFloat(item.SuperficieCubierta ?? item.superficieCubierta ?? 0) || null

  // Ambientes / dormitorios
  const bedrooms = parseInt(item.Dormitorios ?? item.dormitorios ?? item.Habitaciones ?? 0) || null
  const bathrooms = parseInt(item.Banos ?? item.banos ?? item.Baños ?? 0) || null
  const garages = parseInt(item.Cocheras ?? item.cocheras ?? 0) || null

  // Descripciones
  const description = item.Descripcion ?? item.descripcion ?? item.Observaciones ?? ''
  const short_description = item.DescripcionCorta ?? item.descripcionCorta ?? String(description).slice(0, 200)

  // Estado
  const status = 'disponible'

  return {
    id: id || undefined, // si está vacío Supabase genera UUID
    title,
    operation_type,
    property_type,
    neighborhood,
    price,
    currency,
    surface_total,
    surface_covered,
    bedrooms,
    bathrooms,
    garages,
    description,
    short_description,
    status,
  }
}

async function main() {
  console.log('Descargando XML de Adinco...')
  const res = await fetch(ADINCO_URL)
  if (!res.ok) throw new Error(`Error al descargar XML: ${res.status} ${res.statusText}`)
  const xml = await res.text()
  console.log(`XML descargado (${Math.round(xml.length / 1024)} KB)`)

  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
  const parsed = parser.parse(xml)

  // Adinco envuelve los items en distintos nodos según la versión
  // Intentamos los más comunes
  const root = parsed.Inmuebles ?? parsed.inmuebles ?? parsed.Properties ?? parsed.properties ?? parsed
  let items = root.Inmueble ?? root.inmueble ?? root.Property ?? root.property ?? []

  if (!Array.isArray(items)) items = [items] // si hay una sola propiedad

  console.log(`Propiedades encontradas en el XML: ${items.length}`)

  const properties = items.map(mapAdincoToProperty)

  // Upsert en lotes de 50
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < properties.length; i += BATCH) {
    const batch = properties.slice(i, i + BATCH)
    const { error } = await supabase.from('properties').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`Error en lote ${i / BATCH + 1}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  ✓ ${inserted}/${properties.length} propiedades importadas`)
    }
  }

  console.log(`\nListo. ${inserted} propiedades cargadas en Supabase.`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
