import type { HistorialEntry } from '../types'

const KEY = 'tasadoria_historial'
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
  const updated = [entry, ...entries].slice(0, MAX_ENTRIES)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function deleteHistorialEntry(id: string): void {
  const entries = getHistorial().filter((e) => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function clearHistorial(): void {
  localStorage.removeItem(KEY)
}
