import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseProperty, ComparableSupabase, TasacionForm } from '../types'
import { getSettings } from './storage'

let _client: SupabaseClient | null = null
let _clientUrl = ''
let _clientKey = ''

function getSupabaseClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getSettings()
  if (!_client || supabaseUrl !== _clientUrl || supabaseAnonKey !== _clientKey) {
    _client = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
    _clientUrl = supabaseUrl
    _clientKey = supabaseAnonKey
  }
  return _client
}

export async function fetchProperties(): Promise<SupabaseProperty[]> {
  const { data, error } = await getSupabaseClient()
    .from('properties')
    .select(
      'id, title, operation_type, property_type, neighborhood, price, currency, surface_total, surface_covered, bedrooms, bathrooms, garages, status, short_description, description'
    )
    // Sin filtro de status — traemos toda la cartera para tener más comparables

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message)
  }
  return (data as SupabaseProperty[]) ?? []
}

function similarityScore(prop: SupabaseProperty, form: TasacionForm): number {
  let score = 0

  // Zona / neighborhood (40 pts)
  const zonaForm = (form.country || form.ubicacion || '').toLowerCase()
  const zonaDb = (prop.neighborhood || '').toLowerCase()
  if (zonaDb && zonaForm && zonaDb.includes(zonaForm.split(' ')[0])) score += 40
  else if (zonaDb && zonaForm && zonaForm.includes(zonaDb.split(' ')[0])) score += 30

  // Tipo propiedad (25 pts)
  const tipoForm = form.tipoPropiedad.toLowerCase()
  const tipoDb = (prop.property_type || '').toLowerCase()
  if (tipoDb && tipoForm.includes(tipoDb)) score += 25
  else if (tipoDb && tipoDb.includes('casa') && tipoForm.includes('casa')) score += 20
  else if (tipoDb && tipoDb.includes('lote') && tipoForm.includes('lote')) score += 20
  else if (tipoDb && tipoDb.includes('depto') && tipoForm.includes('depto')) score += 20

  // M² cubiertos (20 pts)
  const m2Form = parseFloat(form.m2Cubiertos || '0')
  const m2Db = prop.surface_covered || prop.surface_total || 0
  if (m2Form > 0 && m2Db > 0) {
    const diff = Math.abs(m2Form - m2Db) / m2Form
    if (diff <= 0.1) score += 20
    else if (diff <= 0.2) score += 15
    else if (diff <= 0.3) score += 10
    else if (diff <= 0.4) score += 5
  }

  // Precio similar (15 pts)
  const precioForm = parseFloat(form.precioPretendido || '0')
  const precioDb = prop.price || 0
  if (precioForm > 0 && precioDb > 0) {
    const diff = Math.abs(precioForm - precioDb) / precioForm
    if (diff <= 0.15) score += 15
    else if (diff <= 0.3) score += 10
    else if (diff <= 0.5) score += 5
  }

  return score
}

export function computeComparables(
  properties: SupabaseProperty[],
  form: TasacionForm
): ComparableSupabase[] {
  return properties
    .map((p) => ({ ...p, score: similarityScore(p, form), seleccionado: false }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}
