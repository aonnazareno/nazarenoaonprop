import type { HistorialEntry, TasacionForm } from '../types'

const KEY = 'tasadoria_historial'
const DRAFT_KEY = 'tasadoria_borrador'
const MAX_ENTRIES = 50

export function getHistorial(): HistorialEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistorialEntry[]
  } catch {
    return []
  }
}

export function saveHistorial(entry: HistorialEntry): void {
  const entries = getHistorial()
  let updated = [entry, ...entries].slice(0, MAX_ENTRIES)
  // Si supera la cuota, reducir hasta que entre
  while (updated.length > 0) {
    try {
      localStorage.setItem(KEY, JSON.stringify(updated))
      return
    } catch {
      updated = updated.slice(0, Math.floor(updated.length * 0.7))
    }
  }
}

export function updateHistorialEntry(id: string, updates: Partial<HistorialEntry>): void {
  const entries = getHistorial().map((e) => (e.id === id ? { ...e, ...updates } : e))
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function deleteHistorialEntry(id: string): void {
  const entries = getHistorial().filter((e) => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function clearHistorial(): void {
  localStorage.removeItem(KEY)
}

// ─── Draft (borrador) ─────────────────────────────────────────────────────────

export function getDraft(): Omit<TasacionForm, 'fotos'> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Omit<TasacionForm, 'fotos'>
  } catch {
    return null
  }
}

export function saveDraft(form: TasacionForm): void {
  // Skip photos — too large for localStorage
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fotos: _fotos, ...rest } = form
  localStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}

// ─── Settings (API keys) ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'tasadoria_settings'

export interface AppSettings {
  anthropicKey: string
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { anthropicKey: '', supabaseUrl: '', supabaseAnonKey: '' }
    return JSON.parse(raw) as AppSettings
  } catch {
    return { anthropicKey: '', supabaseUrl: '', supabaseAnonKey: '' }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
