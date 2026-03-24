import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Key, Database, Info, Lightbulb, Save } from 'lucide-react'
import { getSettings, saveSettings, type AppSettings } from '../../lib/storage'

function maskKey(key: string) {
  if (!key) return '—'
  return key.slice(0, 12) + '...' + key.slice(-6)
}

type TestStatus = 'idle' | 'loading' | 'ok' | 'error'

export default function Configuracion() {
  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [saved, setSaved] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<TestStatus>('idle')
  const [claudeStatus, setClaudeStatus] = useState<TestStatus>('idle')
  const [supabaseMsg, setSupabaseMsg] = useState('')
  const [claudeMsg, setClaudeMsg] = useState('')

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testSupabase = async () => {
    setSupabaseStatus('loading')
    setSupabaseMsg('')
    try {
      const res = await fetch(
        `${settings.supabaseUrl}/rest/v1/properties?select=id&limit=1`,
        {
          headers: {
            apikey: settings.supabaseAnonKey,
            Authorization: `Bearer ${settings.supabaseAnonKey}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        setSupabaseStatus('ok')
        setSupabaseMsg(`Conexión exitosa. ${Array.isArray(data) ? data.length : 0} registros devueltos en prueba.`)
      } else {
        const err = await res.text()
        setSupabaseStatus('error')
        setSupabaseMsg(`Error ${res.status}: ${err}`)
      }
    } catch (e) {
      setSupabaseStatus('error')
      setSupabaseMsg(e instanceof Error ? e.message : 'Error de conexión')
    }
  }

  const testClaude = async () => {
    setClaudeStatus('loading')
    setClaudeMsg('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': settings.anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 32,
          messages: [{ role: 'user', content: 'Responde solo: OK' }],
        }),
      })
      if (res.ok) {
        setClaudeStatus('ok')
        setClaudeMsg('API de Claude operativa.')
      } else {
        const err = await res.text()
        setClaudeStatus('error')
        setClaudeMsg(`Error ${res.status}: ${err}`)
      }
    } catch (e) {
      setClaudeStatus('error')
      setClaudeMsg(e instanceof Error ? e.message : 'Error de conexión')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="section-title">Configuración</h2>
        <p className="text-sm text-gris">Claves de acceso y diagnóstico de conexiones.</p>
      </div>

      {/* Keys form */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Key size={18} className="text-verde" />
          <h3 className="font-cormorant text-xl font-semibold">Claves de acceso</h3>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gris text-xs block mb-1">Anthropic API Key</span>
            <input
              type="password"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-verde"
              value={settings.anthropicKey}
              onChange={(e) => setSettings((s) => ({ ...s, anthropicKey: e.target.value }))}
              placeholder="sk-ant-..."
            />
          </label>

          <label className="block text-sm">
            <span className="text-gris text-xs block mb-1">Supabase URL</span>
            <input
              type="text"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-verde"
              value={settings.supabaseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, supabaseUrl: e.target.value }))}
              placeholder="https://xxxx.supabase.co"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gris text-xs block mb-1">Supabase Anon Key</span>
            <input
              type="password"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-verde"
              value={settings.supabaseAnonKey}
              onChange={(e) => setSettings((s) => ({ ...s, supabaseAnonKey: e.target.value }))}
              placeholder="eyJ..."
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? 'Guardado' : 'Guardar claves'}
        </button>
      </div>

      {/* Supabase test */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-verde" />
          <h3 className="font-cormorant text-xl font-semibold">Probar Supabase</h3>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <ConfigRow label="URL" value={settings.supabaseUrl || '—'} />
          <ConfigRow label="Anon key" value={maskKey(settings.supabaseAnonKey)} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={testSupabase}
            disabled={supabaseStatus === 'loading' || !settings.supabaseUrl}
            className="btn-secondary flex items-center gap-2"
          >
            {supabaseStatus === 'loading' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Database size={13} />
            )}
            Probar conexión
          </button>
          <StatusBadge status={supabaseStatus} />
        </div>
        {supabaseMsg && (
          <p className={`text-xs p-2 rounded ${supabaseStatus === 'ok' ? 'bg-verde-muted text-verde' : 'bg-red-50 text-red-600'}`}>
            {supabaseMsg}
          </p>
        )}
      </div>

      {/* Claude test */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Key size={18} className="text-verde" />
          <h3 className="font-cormorant text-xl font-semibold">Probar Claude API</h3>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <ConfigRow label="API Key" value={maskKey(settings.anthropicKey)} />
          <ConfigRow label="Modelo tasación" value="claude-sonnet-4-6" />
          <ConfigRow label="Búsqueda web" value="Habilitada" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={testClaude}
            disabled={claudeStatus === 'loading' || !settings.anthropicKey}
            className="btn-secondary flex items-center gap-2"
          >
            {claudeStatus === 'loading' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Key size={13} />
            )}
            Probar API
          </button>
          <StatusBadge status={claudeStatus} />
        </div>
        {claudeMsg && (
          <p className={`text-xs p-2 rounded ${claudeStatus === 'ok' ? 'bg-verde-muted text-verde' : 'bg-red-50 text-red-600'}`}>
            {claudeMsg}
          </p>
        )}
      </div>

      {/* Info */}
      <div className="card border border-blue-100 bg-blue-50 space-y-3">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          <h3 className="font-medium text-blue-800 text-sm">Sobre esta herramienta</h3>
        </div>
        <div className="space-y-2 text-xs text-blue-700">
          <InfoRow label="Nombre" value="TasadorIA v1.0" />
          <InfoRow label="Empresa" value="Calderón Propiedades · Mat. 227 · Zona Oeste GBA" />
          <InfoRow label="Usuarios" value="Nazareno y Patricia Calderón" />
          <InfoRow label="Historial" value="Guardado en localStorage (máx. 50 tasaciones)" />
          <InfoRow label="Claves" value="Guardadas en localStorage del navegador" />
        </div>
      </div>

      {/* Tips */}
      <div className="card border border-yellow-100 bg-yellow-50 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-yellow-600" />
          <h3 className="font-medium text-yellow-800 text-sm">Consejos para mejores tasaciones</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-yellow-700">
          <li>• Subí fotos claras del interior y exterior — la IA detecta calidad constructiva.</li>
          <li>• Seleccioná comparables similares en m², zona y tipo para resultados más precisos.</li>
          <li>• Combiná comparables de cartera propia + portales para mayor confianza.</li>
          <li>• Usá el campo "Observaciones del corredor" para contexto que la IA no puede ver.</li>
          <li>• Para countries, indicar la calidad constructiva mejora significativamente el rango.</li>
          <li>• La urgencia de venta impacta en el precio de cierre estimado.</li>
        </ul>
      </div>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
      <span className="text-gris w-32 flex-shrink-0 text-xs">{label}</span>
      <span className="text-gray-700 font-medium text-xs font-mono truncate">{value}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-blue-500 w-24 flex-shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: TestStatus }) {
  if (status === 'idle') return null
  if (status === 'loading')
    return <span className="text-xs text-gris font-montserrat">Probando...</span>
  if (status === 'ok')
    return (
      <span className="flex items-center gap-1 text-xs text-verde font-medium font-montserrat">
        <CheckCircle2 size={13} /> Conectado
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-medium font-montserrat">
      <XCircle size={13} /> Error
    </span>
  )
}
