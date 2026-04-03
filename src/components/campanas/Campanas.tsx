import { useState } from 'react'
import {
  Copy, CheckCheck, ExternalLink, Megaphone, Target,
  CheckCircle2, Circle, ChevronDown, ChevronUp, Link2,
  BarChart3, MessageCircle, Search
} from 'lucide-react'
import clsx from 'clsx'

const WA_NUMBER = '5491125935313'
const META_PIXEL = '1922403028664939'
const GA4_ID = 'G-27XM4P7QCP'

function waLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

function utmUrl(base: string, source: string, medium: string, campaign: string, content?: string) {
  const url = new URL(base)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}

const WEBSITE = 'https://inmobiliariacalderon.com.ar'

// ── Campañas Meta Click-to-WhatsApp ─────────────────────────────
const META_CAMPAIGNS = [
  {
    id: 'tasacion_meta_a',
    campaña: 'TASACION_MES1',
    objetivo: 'Tasación gratuita',
    copy: 'Copy A',
    audiencia: 'Propietarios Zona Oeste GBA · 35-65 años',
    mensaje: 'Hola! Vi su anuncio en Instagram y quiero una tasación gratuita de mi propiedad en Zona Oeste.',
    color: 'blue' as const,
  },
  {
    id: 'tasacion_meta_b',
    campaña: 'TASACION_MES1',
    objetivo: 'Tasación gratuita',
    copy: 'Copy B',
    audiencia: 'Propietarios Zona Oeste GBA · 35-65 años',
    mensaje: 'Hola! Los vi en Facebook y quiero saber cuánto vale mi propiedad en Zona Oeste.',
    color: 'blue' as const,
  },
  {
    id: 'captacion_meta',
    campaña: 'CAPTACION_MES1',
    objetivo: 'Captación de propiedades',
    copy: 'Copy A',
    audiencia: 'Propietarios con intención de venta · Zona Oeste',
    mensaje: 'Hola! Vi su anuncio en Instagram y me interesa que gestionen la venta/alquiler de mi propiedad.',
    color: 'yellow' as const,
  },
  {
    id: 'sandiego_meta_a',
    campaña: 'VENTAS_SANDIEGO_MES1',
    objetivo: 'Propiedad — San Diego',
    copy: 'Copy A',
    audiencia: 'Compradores countries Zona Oeste · 30-55 años',
    mensaje: 'Hola! Vi su anuncio en Instagram sobre la propiedad en San Diego y quiero más información.',
    color: 'green' as const,
  },
  {
    id: 'sandiego_meta_b',
    campaña: 'VENTAS_SANDIEGO_MES1',
    objetivo: 'Propiedad — San Diego',
    copy: 'Copy B',
    audiencia: 'Compradores countries Zona Oeste · 30-55 años',
    mensaje: 'Hola! Vi la publicación en Facebook de la propiedad en San Diego. Me gustaría obtener más detalles.',
    color: 'green' as const,
  },
  {
    id: 'campos_meta_a',
    campaña: 'VENTAS_CAMPOS_MES1',
    objetivo: 'Propiedad — Campos de Álvarez',
    copy: 'Copy A',
    audiencia: 'Compradores countries Zona Oeste · 30-55 años',
    mensaje: 'Hola! Vi su anuncio en Instagram sobre Campos de Álvarez y quisiera recibir más información.',
    color: 'green' as const,
  },
  {
    id: 'terravista_meta_a',
    campaña: 'VENTAS_TERRAVISTA_MES1',
    objetivo: 'Propiedad — Terravista',
    copy: 'Copy A',
    audiencia: 'Compradores countries Zona Oeste · 30-55 años',
    mensaje: 'Hola! Vi el anuncio de Terravista en Instagram y me interesa conocer más detalles.',
    color: 'green' as const,
  },
]

// ── Campañas Google Ads (Search) ────────────────────────────────
const GOOGLE_CAMPAIGNS = [
  {
    id: 'g_tasacion',
    campaña: 'Search — Tasación',
    adGroup: 'Tasación inmuebles Zona Oeste',
    keywords: [
      '"tasación de propiedades zona oeste"',
      '"cuánto vale mi casa moreno"',
      '"tasador inmobiliario GBA oeste"',
      '"tasación gratis inmueble"',
    ],
    titulos: ['Tasación Gratuita Zona Oeste', 'Valuamos Tu Propiedad Hoy', 'Calderón Propiedades · Mat. 227'],
    descripcion: 'Tasación profesional gratuita en Zona Oeste GBA. Más de 15 años de experiencia. Respondemos por WhatsApp.',
    utmCampaign: 'tasacion_google_mes1',
    destino: utmUrl(WEBSITE, 'google', 'cpc', 'tasacion_google_mes1', 'search'),
  },
  {
    id: 'g_captacion',
    campaña: 'Search — Captación',
    adGroup: 'Vender propiedad Zona Oeste',
    keywords: [
      '"vender casa zona oeste"',
      '"inmobiliaria moreno ituzaingo"',
      '"publicar propiedad en venta GBA"',
      '"inmobiliaria zona oeste GBA"',
    ],
    titulos: ['Vendé Tu Propiedad Rápido', 'Inmobiliaria Zona Oeste · Mat.227', 'Tasación + Venta en Zona Oeste'],
    descripcion: 'Gestionamos la venta de tu propiedad en Zona Oeste. Tasación gratis + atención personalizada. Calderón Propiedades.',
    utmCampaign: 'captacion_google_mes1',
    destino: utmUrl(WEBSITE, 'google', 'cpc', 'captacion_google_mes1', 'search'),
  },
  {
    id: 'g_ventas',
    campaña: 'Search — Propiedades en venta',
    adGroup: 'Countries y lotes Zona Oeste',
    keywords: [
      '"casas en countries zona oeste"',
      '"lotes en venta moreno"',
      '"propiedades country GBA oeste"',
      '"casa en venta Ituzaingó Moreno"',
    ],
    titulos: ['Casas en Countries Zona Oeste', 'Propiedades Exclusivas Zona Oeste', 'Calderón Propiedades · Mat.227'],
    descripcion: 'Propiedades seleccionadas en countries de Zona Oeste GBA. Contactanos por WhatsApp para coordinar visita.',
    utmCampaign: 'ventas_google_mes1',
    destino: utmUrl(WEBSITE, 'google', 'cpc', 'ventas_google_mes1', 'search'),
  },
]

// ── Checklist de lanzamiento ────────────────────────────────────
const CHECKLIST = [
  { id: 1, label: 'Meta Pixel instalado en el sitio', done: true },
  { id: 2, label: `GA4 (${GA4_ID}) instalado y activo`, done: true },
  { id: 3, label: 'Copies A y B producidos (3 propiedades ancla)', done: true },
  { id: 4, label: 'Cuenta de Meta Ads configurada', done: false },
  { id: 5, label: 'Audiencias guardadas en Meta (propietarios + compradores)', done: false },
  { id: 6, label: 'Presupuesto diario asignado por campaña', done: false },
  { id: 7, label: 'Links de WhatsApp cargados en cada anuncio Meta', done: false },
  { id: 8, label: 'Google Ads — cuenta creada y facturación activa', done: false },
  { id: 9, label: 'Google Ads — extensiones de llamada y sitio cargadas', done: false },
  { id: 10, label: 'Conversiones configuradas en Meta Ads Manager', done: false },
  { id: 11, label: 'Conversiones importadas en Google Ads desde GA4', done: false },
]

// ── Helpers UI ──────────────────────────────────────────────────
const COLOR_MAP = {
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  green: 'bg-verde-muted border-verde-light text-verde-dark',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
}

const BADGE_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-verde-light text-verde-dark',
  yellow: 'bg-yellow-100 text-yellow-700',
}

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className={clsx(
        'flex items-center gap-1 rounded font-montserrat font-medium transition-colors',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-xs',
        copied
          ? 'bg-verde-muted text-verde'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

// ── Componente principal ─────────────────────────────────────────
export default function Campanas() {
  const [openGoogle, setOpenGoogle] = useState<string | null>(null)
  const [checklist, setChecklist] = useState(() =>
    CHECKLIST.reduce<Record<number, boolean>>((acc, item) => {
      acc[item.id] = item.done
      return acc
    }, {})
  )

  const doneCount = Object.values(checklist).filter(Boolean).length

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="section-title">Campañas · Mes 1</h2>
        <p className="text-sm text-gris">
          Links, estructura y checklist para Meta Ads y Google Ads · Calderón Propiedades
        </p>
      </div>

      {/* ── Checklist ─────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-verde" />
            <h3 className="font-cormorant text-xl font-semibold">Checklist de lanzamiento</h3>
          </div>
          <span className={clsx(
            'chip text-xs font-medium',
            doneCount === CHECKLIST.length ? 'bg-verde-muted text-verde' : 'bg-gray-100 text-gray-600'
          )}>
            {doneCount}/{CHECKLIST.length} completados
          </span>
        </div>
        <div className="space-y-2">
          {CHECKLIST.map(item => (
            <button
              key={item.id}
              onClick={() => setChecklist(s => ({ ...s, [item.id]: !s[item.id] }))}
              className="w-full flex items-center gap-3 text-left py-2 px-3 rounded-lg hover:bg-crema transition-colors group"
            >
              {checklist[item.id]
                ? <CheckCircle2 size={16} className="text-verde flex-shrink-0" />
                : <Circle size={16} className="text-gray-300 flex-shrink-0 group-hover:text-gris" />
              }
              <span className={clsx(
                'text-sm font-montserrat',
                checklist[item.id] ? 'line-through text-gris' : 'text-gray-700'
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Links Meta Click-to-WhatsApp ───────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-500" />
          <h3 className="font-cormorant text-xl font-semibold">Links Meta · Click-to-WhatsApp</h3>
        </div>
        <p className="text-xs text-gris">
          Pegá estos links directamente en cada anuncio de Meta Ads Manager (campo "URL de WhatsApp").
          Cada mensaje pre-cargado identifica de qué anuncio viene el lead.
        </p>

        <div className="space-y-3">
          {META_CAMPAIGNS.map(camp => {
            const link = waLink(camp.mensaje)
            return (
              <div
                key={camp.id}
                className={clsx('border rounded-lg p-4 space-y-2', COLOR_MAP[camp.color])}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('chip text-xs', BADGE_MAP[camp.color])}>
                        {camp.objetivo}
                      </span>
                      <span className="text-xs text-gris font-montserrat">{camp.copy}</span>
                    </div>
                    <p className="text-xs mt-1 text-gris">{camp.audiencia}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <CopyButton text={link} />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink size={12} className="text-gray-500" />
                    </a>
                  </div>
                </div>
                <div className="bg-white/70 rounded px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">Mensaje pre-cargado:</p>
                  <p className="text-xs text-gray-700 italic">"{camp.mensaje}"</p>
                </div>
                <div className="bg-white/50 rounded px-2 py-1">
                  <p className="text-xs font-mono text-gray-500 truncate">{link}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Google Ads ─────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-orange-500" />
          <h3 className="font-cormorant text-xl font-semibold">Google Ads · Búsqueda</h3>
        </div>
        <p className="text-xs text-gris">
          Campañas Search con UTM parameters. El tráfico llega al sitio con tracking GA4 automático.
          Luego el usuario contacta por WhatsApp desde el sitio.
        </p>

        <div className="space-y-3">
          {GOOGLE_CAMPAIGNS.map(camp => (
            <div key={camp.id} className="border border-orange-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenGoogle(openGoogle === camp.id ? null : camp.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-orange-500" />
                  <span className="text-sm font-medium text-orange-800 font-montserrat">{camp.campaña}</span>
                </div>
                {openGoogle === camp.id ? <ChevronUp size={14} className="text-orange-500" /> : <ChevronDown size={14} className="text-orange-500" />}
              </button>

              {openGoogle === camp.id && (
                <div className="px-4 py-4 space-y-4 bg-white">
                  {/* Keywords */}
                  <div>
                    <p className="label">Keywords (concordancia de frase)</p>
                    <div className="flex flex-wrap gap-2">
                      {camp.keywords.map(kw => (
                        <span key={kw} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded font-mono">
                          {kw}
                          <CopyButton text={kw} size="xs" />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Titulos */}
                  <div>
                    <p className="label">Titulares (máx. 30 car.)</p>
                    <div className="space-y-1">
                      {camp.titulos.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gris w-4">{i + 1}.</span>
                          <span className="text-xs text-gray-700 font-medium flex-1">{t}</span>
                          <CopyButton text={t} size="xs" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descripcion */}
                  <div>
                    <p className="label">Descripción</p>
                    <div className="flex items-start gap-2 bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-700 flex-1">{camp.descripcion}</p>
                      <CopyButton text={camp.descripcion} size="xs" />
                    </div>
                  </div>

                  {/* URL destino */}
                  <div>
                    <p className="label">URL de destino final (con UTMs)</p>
                    <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
                      <p className="text-xs font-mono text-gray-600 flex-1 break-all">{camp.destino}</p>
                      <CopyButton text={camp.destino} size="xs" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Generador de Links UTM ─────────────────────────────── */}
      <UtmGenerator />

      {/* ── Setup de conversiones ─────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-purple-500" />
          <h3 className="font-cormorant text-xl font-semibold">Configurar conversiones</h3>
        </div>

        <div className="space-y-3">
          {/* Meta */}
          <div className="border border-blue-100 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-800 font-montserrat">Meta Ads Manager</p>
            <ul className="space-y-1 text-xs text-blue-700">
              <li>1. Ir a <strong>Administrador de eventos</strong> → Pixel <code className="bg-blue-50 px-1 rounded">{META_PIXEL}</code></li>
              <li>2. Crear evento personalizado: <strong>Lead</strong> cuando se abre WhatsApp</li>
              <li>3. En cada campaña Click-to-WhatsApp, configurar objetivo = <strong>Mensajes</strong></li>
              <li>4. Meta rastrea automáticamente conversaciones iniciadas</li>
            </ul>
          </div>

          {/* GA4 */}
          <div className="border border-green-100 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-verde font-montserrat">GA4 — Evento WhatsApp en el sitio</p>
            <p className="text-xs text-gris mb-2">
              Agregá este código al botón de WhatsApp de <code className="bg-gray-100 px-1 rounded">inmobiliariacalderon.com.ar</code>:
            </p>
            <div className="relative bg-gray-900 rounded-lg p-3">
              <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre">{`gtag('event', 'click_whatsapp', {
  'event_category': 'contacto',
  'event_label': 'whatsapp_boton_sitio'
});`}</pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={`gtag('event', 'click_whatsapp', {\n  'event_category': 'contacto',\n  'event_label': 'whatsapp_boton_sitio'\n});`} size="xs" />
              </div>
            </div>
            <p className="text-xs text-gris">
              Luego en GA4 → Configurar → Eventos → marcar <strong>click_whatsapp</strong> como conversión.
            </p>
          </div>

          {/* Google Ads import */}
          <div className="border border-orange-100 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-orange-800 font-montserrat">Google Ads — Importar conversiones desde GA4</p>
            <ul className="space-y-1 text-xs text-orange-700">
              <li>1. En Google Ads: <strong>Herramientas → Medición → Conversiones</strong></li>
              <li>2. <strong>+ Nueva conversión → Importar → Google Analytics 4 ({GA4_ID})</strong></li>
              <li>3. Seleccionar el evento <strong>click_whatsapp</strong></li>
              <li>4. Asignar valor = $1 (para optimización de puja)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Info Meta Pixel ───────────────────────────────────── */}
      <div className="card border border-gray-100 bg-gray-50 flex items-start gap-3">
        <Megaphone size={16} className="text-gris mt-0.5 flex-shrink-0" />
        <div className="space-y-1 text-xs text-gris-dark">
          <p><strong>Meta Pixel:</strong> <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">{META_PIXEL}</code></p>
          <p><strong>GA4 Measurement ID:</strong> <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">{GA4_ID}</code></p>
          <p><strong>WhatsApp:</strong> <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">+54 9 11 2593-5313</code></p>
          <p><strong>Sitio web:</strong> <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">{WEBSITE}</code></p>
        </div>
      </div>
    </div>
  )
}

// ── Generador UTM ────────────────────────────────────────────────
function UtmGenerator() {
  const [source, setSource] = useState('meta')
  const [medium, setMedium] = useState('social')
  const [campaign, setCampaign] = useState('tasacion_mes1')
  const [content, setContent] = useState('copy_a')
  const [baseUrl, setBaseUrl] = useState(WEBSITE)

  const generatedUrl = utmUrl(baseUrl, source, medium, campaign, content || undefined)

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Link2 size={18} className="text-verde" />
        <h3 className="font-cormorant text-xl font-semibold">Generador de Links UTM</h3>
      </div>
      <p className="text-xs text-gris">Para links del sitio web hacia WhatsApp o páginas específicas.</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">URL base</label>
          <input
            className="input-field text-xs"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://inmobiliariacalderon.com.ar"
          />
        </div>
        <div>
          <label className="label">utm_source</label>
          <select
            className="select-field text-xs"
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            <option value="meta">meta</option>
            <option value="google">google</option>
            <option value="instagram">instagram</option>
            <option value="facebook">facebook</option>
            <option value="whatsapp">whatsapp</option>
            <option value="organico">organico</option>
          </select>
        </div>
        <div>
          <label className="label">utm_medium</label>
          <select
            className="select-field text-xs"
            value={medium}
            onChange={e => setMedium(e.target.value)}
          >
            <option value="social">social</option>
            <option value="cpc">cpc</option>
            <option value="email">email</option>
            <option value="qr">qr</option>
          </select>
        </div>
        <div>
          <label className="label">utm_campaign</label>
          <input
            className="input-field text-xs"
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder="tasacion_mes1"
          />
        </div>
        <div className="col-span-2">
          <label className="label">utm_content (opcional)</label>
          <input
            className="input-field text-xs"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="copy_a"
          />
        </div>
      </div>

      <div>
        <label className="label">Link generado</label>
        <div className="flex items-start gap-2 bg-verde-muted border border-verde-light rounded-lg p-3">
          <p className="text-xs font-mono text-verde-dark flex-1 break-all">{generatedUrl}</p>
          <CopyButton text={generatedUrl} />
        </div>
      </div>
    </div>
  )
}
