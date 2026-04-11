import type { TasacionResult, TasacionForm } from '../types'
import logoUrl from '../assets/logo.jpg'

/** Only images (uploaded as foto/imagen) — no videos, no PDFs */
function getImages(form: TasacionForm) {
  return form.fotos.filter((f) => !f.tipo || f.tipo === 'imagen')
}

/** CSS for the photo grid (shared between both PDFs) */
const PHOTO_GRID_CSS = `
.foto-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.foto-grid img{width:100%;height:150px;object-fit:cover;border-radius:4px;display:block;page-break-inside:avoid}
@media print{.foto-grid img{height:130px}}`

/** HTML block for the photo grid — empty string if no images */
function buildPhotoGrid(form: TasacionForm, titleCss = 'stitle'): string {
  const imgs = getImages(form)
  if (imgs.length === 0) return ''
  return `
<div class="section">
  <div class="${titleCss}">Fotografías de la propiedad (${imgs.length})</div>
  <div class="foto-grid">
    ${imgs.map((f) => `<img src="${f.dataUrl}" alt="${esc(f.name)}" loading="eager">`).join('\n    ')}
  </div>
</div>`
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl(s: string | null | undefined): string {
  return esc(s).replace(/\n/g, '<br>')
}

function usd(n: number | null | undefined): string {
  if (!n) return '—'
  return `USD&nbsp;${Math.round(n).toLocaleString('es-AR')}`
}

function pct(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

export function generatePDFReport(
  result: TasacionResult,
  form: TasacionForm,
  counts: { supabase: number; portales: number; manuales: number }
): void {
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const titulo = [form.tipoPropiedad, form.country, form.ubicacion].filter(Boolean).join(' · ')

  const comparablesIncluidos = (result.comparables_analizados ?? []).filter((c) => c.incluido)
  const comparablesExcluidos = (result.comparables_analizados ?? []).filter((c) => !c.incluido)
  const totalAjustes = (result.ajustes_aplicados ?? []).reduce((s, a) => s + a.impacto_pct, 0)
  const totalComparables = counts.supabase + counts.portales + counts.manuales

  // Semáforo
  let semaforoColor = '#16a34a'
  let semaforoLabel = 'En línea con el mercado'
  if (result.desvio_signo === 'sobrevaluado') {
    semaforoColor = result.desvio_pct > 25 ? '#dc2626' : '#ea580c'
    semaforoLabel = result.desvio_pct > 25 ? 'Muy sobrevaluado' : 'Sobrevaluado'
  } else if (result.desvio_signo === 'subvaluado') {
    semaforoColor = '#2563eb'
    semaforoLabel = 'Subvaluado'
  }

  const detailRow = (label: string, value: string | undefined | null) =>
    value
      ? `<tr><td class="dl">${esc(label)}</td><td class="dv">${esc(value)}</td></tr>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de Tasación · ${esc(titulo || 'Propiedad')} · ${esc(fecha)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:1.8cm 2cm}
body{font-family:'Times New Roman',Times,serif;font-size:10.5pt;color:#1a1a1a;line-height:1.55;background:#fff}

/* ── Header ── */
.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:3px solid #2d6a4f;margin-bottom:20px}
.hdr-brand .company{font-size:19pt;font-weight:700;color:#2d6a4f;letter-spacing:.5px;font-family:Georgia,serif}
.hdr-brand .tagline{font-size:8.5pt;color:#555;margin-top:3px}
.hdr-meta{text-align:right;font-size:9pt;color:#555}
.hdr-meta .rtitle{font-size:13pt;font-weight:700;color:#1a1a1a;margin-bottom:2px}

/* ── Sections ── */
.section{margin-bottom:20px;page-break-inside:avoid}
.stitle{font-size:9.5pt;font-weight:700;color:#2d6a4f;text-transform:uppercase;letter-spacing:.9px;border-bottom:1.5px solid #2d6a4f;padding-bottom:4px;margin-bottom:10px}

/* ── Executive box ── */
.exec{border:2px solid #2d6a4f;border-radius:6px;padding:14px 18px;background:#f0faf4;margin-bottom:20px}
.exec-title{font-size:13pt;font-weight:700;color:#2d6a4f;margin-bottom:12px;font-family:Georgia,serif}
.exec-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px}
.estat .elabel{font-size:8pt;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:2px}
.estat .evalue{font-size:15pt;font-weight:700;color:#2d6a4f}
.estat .esub{font-size:8.5pt;color:#555;margin-top:2px}
.exec-divider{border:none;border-top:1px solid #c8e6d4;margin:10px 0}

/* ── Semáforo ── */
.sem{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:10pt;font-weight:700}
.sem-dot{width:9px;height:9px;border-radius:50%;display:inline-block}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#f5f5f0;padding:5px 7px;text-align:left;font-weight:700;font-size:8.5pt;text-transform:uppercase;letter-spacing:.4px;border-bottom:1.5px solid #ddd}
td{padding:5px 7px;border-bottom:1px solid #eee;vertical-align:top}
tr:last-child td{border-bottom:none}
.tr-total{background:#f0faf4;font-weight:700}

/* ── Detail table ── */
.dtable{width:100%;border-collapse:collapse;font-size:9.5pt}
.dtable tr{border-bottom:1px dotted #e0e0e0}
.dtable tr:last-child{border-bottom:none}
.dl{color:#555;padding:3.5px 4px 3.5px 0;width:45%}
.dv{font-weight:600;padding:3.5px 4px;text-align:right}

/* ── Chips ── */
.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.chip{display:inline-block;padding:2.5px 8px;border-radius:12px;font-size:8pt;font-weight:600}
.chip-up{background:#dcfce7;color:#15803d}
.chip-down{background:#fee2e2;color:#dc2626}
.chip-alert{background:#fef9c3;color:#92400e}

/* ── Recommendation ── */
.rec{border-left:4px solid #2d6a4f;background:#f0faf4;padding:12px 16px;border-radius:0 6px 6px 0}
.rec-title{font-size:13pt;font-weight:700;color:#2d6a4f;margin-bottom:6px;font-family:Georgia,serif}

/* ── Comparable rows ── */
.comp-exc td{color:#888}
.apct-pos{color:#15803d;font-weight:700}
.apct-neg{color:#dc2626;font-weight:700}
.motivo-row td{font-size:8.5pt;color:#555;padding-top:2px;padding-bottom:6px;border-bottom:1px solid #e8e8e8;font-style:italic}

/* ── Preformatted ── */
.pre{font-family:'Courier New',monospace;font-size:8.8pt;background:#f8f8f8;border:1px solid #e0e0e0;border-radius:4px;padding:10px 12px;white-space:pre-wrap;line-height:1.55;overflow-wrap:break-word}

/* ── Photo grid ── */
${PHOTO_GRID_CSS}

/* ── Narrative text ── */
.narr{line-height:1.7;color:#1a1a1a;text-align:justify}

/* ── Disclaimer ── */
.disclaimer{border-top:1.5px solid #ddd;padding-top:12px;margin-top:24px;font-size:8pt;color:#777;text-align:center;line-height:1.6}

/* ── Misc ── */
.divider{border:none;border-top:1px solid #eee;margin:12px 0}
.page-break{page-break-before:always}
.no-break{page-break-inside:avoid}
.warn-box{margin-top:10px;padding:7px 10px;background:#fff7ed;border:1px solid #fdba74;border-radius:4px;font-size:9pt}
.int-box{padding:10px 12px;background:#f9f9f9;border:1px dashed #bbb;border-radius:4px;font-size:9.5pt;color:#555}

@media print{
  .no-print{display:none}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>

<!-- ══ HEADER ══ -->
<div class="hdr">
  <div class="hdr-brand" style="display:flex;align-items:center;gap:12px">
    <img src="${logoUrl}" alt="Calderón Propiedades" style="height:52px;width:52px;object-fit:cover;border-radius:50%">
    <div>
      <div class="company">CALDERÓN PROPIEDADES</div>
      <div class="tagline">Matrícula N° 227 &nbsp;·&nbsp; Corredor Público Inmobiliario &nbsp;·&nbsp; Zona Oeste GBA Argentina</div>
    </div>
  </div>
  <div class="hdr-meta">
    <div class="rtitle">Informe de Tasación</div>
    <div>${esc(fecha)}</div>
    <div>Documento de uso interno exclusivo</div>
  </div>
</div>

<!-- ══ IDENTIFICACIÓN ══ -->
<div class="section no-break">
  <div class="stitle">Identificación del Inmueble</div>
  <table class="dtable">
    ${detailRow('Tipo de propiedad', form.tipoPropiedad)}
    ${detailRow('Country / Barrio cerrado', form.country)}
    ${detailRow('Ubicación', form.ubicacion)}
    ${detailRow('M² cubiertos', form.m2Cubiertos ? form.m2Cubiertos + ' m²' : null)}
    ${detailRow('M² terreno / lote', form.m2Terreno ? form.m2Terreno + ' m²' : null)}
    ${detailRow('Ambientes', form.ambientes && form.ambientes !== '0' ? form.ambientes : null)}
    ${detailRow('Baños', form.banos)}
    ${detailRow('Cocheras', form.cocheras)}
    ${detailRow('Antigüedad', form.antiguedad ? form.antiguedad + ' años' : null)}
    ${detailRow('Estado general', form.estadoGeneral)}
    ${detailRow('Calidad constructiva', form.calidadConstructiva)}
    ${detailRow('Orientación', form.orientacion)}
    ${detailRow('Vista', form.vista)}
    ${detailRow('Situación legal', form.situacionLegal)}
    ${detailRow('Ocupación', form.ocupacion)}
    ${detailRow('Urgencia de venta', form.urgenciaVenta)}
    ${detailRow('Precio pretendido', form.precioPretendido ? 'USD ' + parseFloat(form.precioPretendido).toLocaleString('es-AR') : null)}
  </table>
  ${form.observaciones ? `<div style="margin-top:8px;padding:7px 10px;background:#f5f5f0;border-radius:4px;font-size:9.5pt"><strong>Observaciones del corredor:</strong> ${nl(form.observaciones)}</div>` : ''}
</div>

<!-- ══ RESUMEN EJECUTIVO ══ -->
<div class="exec no-break">
  <div class="exec-title">Resumen Ejecutivo de Tasación</div>
  <div class="exec-grid">
    <div class="estat">
      <div class="elabel">Valor probable de mercado</div>
      <div class="evalue">${usd(result.rango_probable)}</div>
      <div class="esub">Rango: ${usd(result.rango_conservador)} – ${usd(result.rango_optimista)}</div>
    </div>
    <div class="estat">
      <div class="elabel">Precio de cierre estimado</div>
      <div class="evalue" style="font-size:12pt">${usd(result.cierre_min)} – ${usd(result.cierre_max)}</div>
      <div class="esub">Margen de negociación: ${result.margen_negociacion ?? '—'}%</div>
    </div>
    <div class="estat">
      <div class="elabel">Confianza del informe</div>
      <div class="evalue">${result.confianza_pct}%</div>
      <div class="esub">${esc(result.confianza_nivel)} &nbsp;·&nbsp; ${totalComparables} comparable${totalComparables !== 1 ? 's' : ''}</div>
    </div>
  </div>

  ${form.precioPretendido ? `
  <hr class="exec-divider">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:9.5pt">
    <span><strong>Precio pretendido:</strong> USD ${parseFloat(form.precioPretendido).toLocaleString('es-AR')}</span>
    <div class="sem" style="background:${semaforoColor}1a;color:${semaforoColor};border:1.5px solid ${semaforoColor}">
      <span class="sem-dot" style="background:${semaforoColor}"></span>
      ${result.desvio_pct > 0 ? '+' : ''}${result.desvio_pct.toFixed(1)}% &nbsp;·&nbsp; ${esc(semaforoLabel)}
    </div>
  </div>` : ''}

  ${result.valor_m2_mercado > 0 || result.valor_m2_propiedad > 0 ? `
  <hr class="exec-divider">
  <div style="display:flex;gap:24px;font-size:9.5pt">
    ${result.valor_m2_mercado ? `<div><span style="color:#555">USD/m² promedio zona:</span> <strong>${Math.round(result.valor_m2_mercado).toLocaleString('es-AR')}</strong></div>` : ''}
    ${result.valor_m2_propiedad ? `<div><span style="color:#555">USD/m² esta propiedad:</span> <strong>${Math.round(result.valor_m2_propiedad).toLocaleString('es-AR')}</strong></div>` : ''}
  </div>` : ''}
</div>

<!-- ══ RANGO DETALLADO ══ -->
<div class="section no-break">
  <div class="stitle">Rango de Valor de Mercado</div>
  <table>
    <thead><tr><th>Escenario</th><th>Valor estimado</th><th>Criterio</th></tr></thead>
    <tbody>
      <tr><td>Conservador</td><td>${usd(result.rango_conservador)}</td><td style="font-size:9pt;color:#555">Condiciones de mercado desfavorables o baja liquidez</td></tr>
      <tr style="background:#f0faf4"><td><strong>Probable</strong></td><td><strong>${usd(result.rango_probable)}</strong></td><td style="font-size:9pt;color:#2d6a4f"><strong>Valor más probable según comparables de mercado</strong></td></tr>
      <tr><td>Optimista</td><td>${usd(result.rango_optimista)}</td><td style="font-size:9pt;color:#555">Condiciones favorables y comprador motivado</td></tr>
    </tbody>
  </table>
</div>

<!-- ══ VARIABLES ══ -->
${result.variables_suben?.length > 0 || result.variables_bajan?.length > 0 || result.variables_alerta?.length > 0 ? `
<div class="section no-break">
  <div class="stitle">Factores que Impactan el Valor</div>
  ${result.variables_suben?.length > 0 ? `<div style="margin-bottom:8px"><div style="font-size:8.5pt;font-weight:700;color:#15803d;margin-bottom:4px">FACTORES POSITIVOS (suman valor)</div><div class="chips">${result.variables_suben.map((v) => `<span class="chip chip-up">↑ ${esc(v)}</span>`).join('')}</div></div>` : ''}
  ${result.variables_bajan?.length > 0 ? `<div style="margin-bottom:8px"><div style="font-size:8.5pt;font-weight:700;color:#dc2626;margin-bottom:4px">FACTORES NEGATIVOS (restan valor)</div><div class="chips">${result.variables_bajan.map((v) => `<span class="chip chip-down">↓ ${esc(v)}</span>`).join('')}</div></div>` : ''}
  ${result.variables_alerta?.length > 0 ? `<div><div style="font-size:8.5pt;font-weight:700;color:#92400e;margin-bottom:4px">ALERTAS</div><div class="chips">${result.variables_alerta.map((v) => `<span class="chip chip-alert">⚠ ${esc(v)}</span>`).join('')}</div></div>` : ''}
</div>` : ''}

<!-- ══ METODOLOGÍA ══ -->
<div class="section">
  <div class="stitle">Metodología de Tasación</div>
  <p class="narr">${nl(result.metodologia)}</p>
</div>

${result.calculo_paso_a_paso ? `
<div class="section">
  <div class="stitle">Cálculo Paso a Paso</div>
  <div class="pre">${esc(result.calculo_paso_a_paso)}</div>
</div>` : ''}

<!-- ══ COMPARABLES ══ -->
${result.comparables_analizados?.length > 0 ? `
<div class="section page-break">
  <div class="stitle">Análisis de Comparables de Mercado (${result.comparables_analizados.length} total · ${comparablesIncluidos.length} incluidos · ${comparablesExcluidos.length} descartados)</div>

  ${comparablesIncluidos.length > 0 ? `
  <div style="font-size:9.5pt;font-weight:700;color:#15803d;margin-bottom:6px">✓ Comparables Incluidos en la Tasación (${comparablesIncluidos.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:22%">Propiedad / Fuente</th>
        <th style="width:12%">Precio pub.</th>
        <th style="width:8%">M²</th>
        <th style="width:11%">USD/m² pub.</th>
        <th style="width:9%">Ajuste</th>
        <th style="width:11%">USD/m² adj.</th>
        <th>Motivo del ajuste e inclusión</th>
      </tr>
    </thead>
    <tbody>
      ${comparablesIncluidos.map((c) => `
      <tr>
        <td><strong>${esc(c.titulo)}</strong><br><span style="font-size:8pt;color:#555">${esc(c.fuente)}</span></td>
        <td>${c.precio_publicacion ? `USD ${Math.round(c.precio_publicacion).toLocaleString('es-AR')}` : '—'}</td>
        <td>${c.m2 ? `${c.m2} m²` : '—'}</td>
        <td>${c.valor_m2 ? c.valor_m2.toLocaleString('es-AR') : '—'}</td>
        <td class="${c.ajuste_pct > 0 ? 'apct-pos' : c.ajuste_pct < 0 ? 'apct-neg' : ''}">${c.ajuste_pct !== 0 ? pct(c.ajuste_pct) : '—'}</td>
        <td style="font-weight:700;color:#2d6a4f">${c.valor_m2_ajustado ? c.valor_m2_ajustado.toLocaleString('es-AR') : '—'}</td>
        <td style="font-size:8.5pt">${c.ajuste_motivos ? `<em>Ajuste:</em> ${esc(c.ajuste_motivos)}<br>` : ''}<em>Inclusión:</em> ${esc(c.motivo_inclusion)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${comparablesExcluidos.length > 0 ? `
  <div style="font-size:9.5pt;font-weight:700;color:#888;margin-top:14px;margin-bottom:6px">✗ Comparables Descartados (${comparablesExcluidos.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:25%">Propiedad / Fuente</th>
        <th style="width:12%">Precio</th>
        <th style="width:8%">M²</th>
        <th style="width:12%">USD/m²</th>
        <th>Motivo del descarte</th>
      </tr>
    </thead>
    <tbody>
      ${comparablesExcluidos.map((c) => `
      <tr class="comp-exc">
        <td>${esc(c.titulo)}<br><span style="font-size:8pt">${esc(c.fuente)}</span></td>
        <td>${c.precio_publicacion ? `USD ${Math.round(c.precio_publicacion).toLocaleString('es-AR')}` : '—'}</td>
        <td>${c.m2 ? `${c.m2} m²` : '—'}</td>
        <td>${c.valor_m2 ? c.valor_m2.toLocaleString('es-AR') : '—'}</td>
        <td style="font-size:8.5pt">${esc(c.motivo_inclusion)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
</div>` : ''}

<!-- ══ AJUSTES ══ -->
${result.ajustes_aplicados?.length > 0 ? `
<div class="section no-break">
  <div class="stitle">Ajustes Aplicados al Valor Base</div>
  <table>
    <thead><tr><th style="width:28%">Concepto</th><th style="width:10%">Impacto</th><th>Descripción</th></tr></thead>
    <tbody>
      ${result.ajustes_aplicados.map((a) => `
      <tr>
        <td><strong>${esc(a.concepto)}</strong></td>
        <td class="${a.impacto_pct > 0 ? 'apct-pos' : a.impacto_pct < 0 ? 'apct-neg' : ''}">${pct(a.impacto_pct)}</td>
        <td style="font-size:9pt">${esc(a.descripcion)}</td>
      </tr>`).join('')}
      <tr class="tr-total">
        <td>IMPACTO TOTAL</td>
        <td class="${totalAjustes > 0 ? 'apct-pos' : totalAjustes < 0 ? 'apct-neg' : ''}">${pct(totalAjustes)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>` : ''}

<!-- ══ JUSTIFICACIÓN ══ -->
<div class="section no-break">
  <div class="stitle">Justificación del Valor</div>
  <p class="narr">${nl(result.justificacion)}</p>
</div>

<!-- ══ CONFIANZA ══ -->
<div class="section no-break">
  <div class="stitle">Nivel de Confianza del Informe</div>
  <table class="dtable">
    <tr><td class="dl">Nivel</td><td class="dv"><strong>${esc(result.confianza_nivel)}</strong> &nbsp;—&nbsp; ${result.confianza_pct}%</td></tr>
    <tr><td class="dl">Fuentes utilizadas</td><td class="dv">
      ${counts.supabase > 0 ? `${counts.supabase} de cartera propia · ` : ''}${counts.portales > 0 ? `${counts.portales} de portales · ` : ''}${counts.manuales > 0 ? `${counts.manuales} manuales · ` : ''}${totalComparables === 0 ? 'Criterio general de mercado (sin comparables directos)' : ''}
    </td></tr>
    <tr><td class="dl">Observación</td><td class="dv" style="font-weight:400">${nl(result.confianza_nota)}</td></tr>
  </table>
  ${result.requiere_visita ? `<div class="warn-box"><strong style="color:#9a3412">⚠ Se recomienda visita presencial:</strong> ${esc(result.requiere_visita_motivo)}</div>` : ''}
</div>

<!-- ══ RECOMENDACIÓN ══ -->
<div class="section no-break">
  <div class="stitle">Recomendación Estratégica</div>
  <div class="rec">
    <div class="rec-title">${esc(result.recomendacion_titulo)}</div>
    <p class="narr">${nl(result.recomendacion_desc)}</p>
    ${result.recomendacion && result.recomendacion !== result.recomendacion_desc ? `<p style="margin-top:8px;font-size:9pt;color:#555">${nl(result.recomendacion)}</p>` : ''}
  </div>
</div>

<!-- ══ ANÁLISIS VISUAL ══ -->
${result.analisis_visual ? `
<div class="section">
  <div class="stitle">Análisis Visual de Fotografías (${form.fotos.length} foto${form.fotos.length !== 1 ? 's' : ''})</div>
  <p class="narr">${nl(result.analisis_visual)}</p>
</div>` : ''}

<!-- ══ OBSERVACIONES INTERNAS ══ -->
${result.observaciones_internas ? `
<div class="section no-break">
  <div class="stitle" style="color:#888;border-color:#bbb">Observaciones Internas — Uso exclusivo del corredor</div>
  <div class="int-box narr">${nl(result.observaciones_internas)}</div>
</div>` : ''}

<!-- ══ ANEXO FOTOGRÁFICO ══ -->
${buildPhotoGrid(form)}

<!-- ══ DISCLAIMER ══ -->
<div class="disclaimer">
  <p><strong>CALDERÓN PROPIEDADES</strong> &nbsp;·&nbsp; Matrícula N° 227 &nbsp;·&nbsp; Corredor Público Inmobiliario &nbsp;·&nbsp; Zona Oeste GBA Argentina</p>
  <p style="margin-top:4px">Este informe es de uso interno exclusivo y fue elaborado con base en comparables de mercado, análisis de portales inmobiliarios y criterio profesional del corredor inmobiliario.</p>
  <p>No constituye tasación oficial ni valuación con efectos jurídicos. Los precios son expresados en dólares estadounidenses (USD) de referencia y son orientativos, sujetos a condiciones de mercado, negociación y características específicas de la operación.</p>
  <p style="margin-top:4px">Generado con TasadorIA &nbsp;·&nbsp; ${esc(fecha)}</p>
</div>

<script>
window.addEventListener('load', function () {
  setTimeout(function () { window.print(); }, 900);
});
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=720')
  if (!win) {
    alert('No se pudo abrir la ventana. Desactivá el bloqueador de pop-ups para esta página y volvé a intentarlo.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ─── Client-facing PDF ────────────────────────────────────────────────────────
export function generateClientPDF(result: TasacionResult, form: TasacionForm): void {
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const titulo = [form.tipoPropiedad, form.country, form.ubicacion].filter(Boolean).join(' · ')

  let semaforoColor = '#16a34a'
  let semaforoLabel = 'En línea con el mercado'
  let semaforoBg = '#f0faf4'
  if (result.desvio_signo === 'sobrevaluado') {
    semaforoColor = result.desvio_pct > 25 ? '#dc2626' : '#ea580c'
    semaforoBg = result.desvio_pct > 25 ? '#fef2f2' : '#fff7ed'
    semaforoLabel = result.desvio_pct > 25 ? 'Precio muy por encima del mercado' : 'Precio por encima del mercado'
  } else if (result.desvio_signo === 'subvaluado') {
    semaforoColor = '#2563eb'
    semaforoBg = '#eff6ff'
    semaforoLabel = 'Precio por debajo del mercado'
  }

  const propRows = [
    ['Tipo de propiedad', form.tipoPropiedad],
    form.country ? ['Country / Barrio cerrado', form.country] : null,
    form.ubicacion ? ['Ubicación', form.ubicacion] : null,
    form.m2Cubiertos ? ['Superficie cubierta', form.m2Cubiertos + ' m²'] : null,
    form.m2Terreno ? ['Terreno / lote', form.m2Terreno + ' m²'] : null,
    form.ambientes && form.ambientes !== '0' ? ['Ambientes', form.ambientes] : null,
    form.banos ? ['Baños', form.banos] : null,
    form.cocheras ? ['Cocheras', form.cocheras] : null,
    form.antiguedad ? ['Antigüedad', form.antiguedad + ' años'] : null,
    form.estadoGeneral ? ['Estado general', form.estadoGeneral] : null,
    form.calidadConstructiva ? ['Calidad constructiva', form.calidadConstructiva] : null,
    form.situacionLegal ? ['Situación legal', form.situacionLegal] : null,
  ].filter(Boolean) as [string, string][]

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe de Tasación para el Propietario · ${esc(titulo || 'Propiedad')} · ${esc(fecha)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;color:#1a1a1a;background:#fff;line-height:1.6}

/* ── Cover banner ── */
.cover-banner{background:#2d6a4f;color:#fff;padding:32px 48px 28px;display:flex;justify-content:space-between;align-items:flex-end}
.cover-company{font-size:22pt;font-weight:700;letter-spacing:.5px}
.cover-sub{font-size:9pt;opacity:.75;margin-top:4px}
.cover-meta{text-align:right;font-size:9pt;opacity:.85}
.cover-meta .doc-title{font-size:14pt;font-weight:600;margin-bottom:2px;opacity:1}

/* ── Body wrapper ── */
.body{padding:36px 48px}

/* ── Property title bar ── */
.prop-bar{border-left:5px solid #2d6a4f;padding:10px 16px;background:#f8fdf9;margin-bottom:28px;border-radius:0 6px 6px 0}
.prop-bar .prop-tipo{font-size:8.5pt;text-transform:uppercase;letter-spacing:.8px;color:#2d6a4f;font-weight:700;margin-bottom:2px}
.prop-bar .prop-titulo{font-size:15pt;font-weight:700;color:#1a1a1a}

/* ── Section heading ── */
.sh{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#2d6a4f;border-bottom:1.5px solid #d1fae5;padding-bottom:4px;margin-bottom:12px}

/* ── Value box ── */
.value-box{background:#f0faf4;border:2px solid #2d6a4f;border-radius:10px;padding:20px 24px;margin-bottom:24px}
.value-box .vb-label{font-size:8pt;text-transform:uppercase;letter-spacing:.6px;color:#555;margin-bottom:4px}
.value-box .vb-main{font-size:26pt;font-weight:800;color:#2d6a4f;letter-spacing:-.5px}
.value-box .vb-sub{font-size:10pt;color:#444;margin-top:4px}
.value-box .vb-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px;padding-top:14px;border-top:1px solid #c8e6d4}
.vb-item .vi-label{font-size:8pt;color:#777;margin-bottom:2px}
.vb-item .vi-value{font-size:11pt;font-weight:700;color:#1a1a1a}

/* ── Semáforo ── */
.sem-box{border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:flex-start;gap:14px}
.sem-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;margin-top:2px}
.sem-title{font-size:11.5pt;font-weight:700;margin-bottom:3px}
.sem-body{font-size:9.5pt;color:#444;line-height:1.5}

/* ── Property table ── */
.prop-table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:24px}
.prop-table td{padding:5px 8px;border-bottom:1px dotted #e5e5e5}
.prop-table td:first-child{color:#555;width:48%}
.prop-table td:last-child{font-weight:600;text-align:right}

/* ── Chips ── */
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px}
.chip{padding:4px 10px;border-radius:14px;font-size:8.5pt;font-weight:600}
.chip-up{background:#dcfce7;color:#15803d}
.chip-down{background:#fee2e2;color:#dc2626}
.chip-alert{background:#fef9c3;color:#92400e}

/* ── Rec box ── */
.rec-box{border-left:5px solid #2d6a4f;background:#f0faf4;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px}
.rec-title{font-size:13pt;font-weight:700;color:#2d6a4f;margin-bottom:6px}
.rec-body{font-size:10pt;color:#2a2a2a;line-height:1.65}

/* ── Confidence row ── */
.conf-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9f9f9;border-radius:6px;margin-bottom:24px;font-size:9.5pt}
.conf-badge{padding:4px 10px;border-radius:12px;font-weight:700;font-size:9pt}
.conf-bar-wrap{flex:1;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden}
.conf-bar{height:100%;border-radius:4px;background:#2d6a4f}

/* ── Methodology note ── */
.method-box{background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;margin-bottom:24px;font-size:9.5pt;color:#444;line-height:1.65}

/* ── Signature area ── */
.signature{display:flex;justify-content:flex-end;margin-top:16px;margin-bottom:0}
.sig-block{text-align:center;min-width:200px}
.sig-line{border-top:1.5px solid #1a1a1a;padding-top:6px;font-size:9pt;color:#333}

/* ── Photo grid ── */
${PHOTO_GRID_CSS}

/* ── Footer / disclaimer ── */
.disclaimer{border-top:1.5px solid #e5e7eb;padding:12px 48px;margin-top:0;font-size:7.5pt;color:#888;text-align:center;line-height:1.6}

/* ── Two-col layout ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}

/* ── Section ── */
.section{margin-bottom:24px}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .no-print{display:none}
}
</style>
</head>
<body>

<!-- COVER BANNER -->
<div class="cover-banner">
  <div style="display:flex;align-items:center;gap:16px">
    <img src="${logoUrl}" alt="Calderón Propiedades" style="height:64px;width:64px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.3)">
    <div>
      <div class="cover-company">CALDERÓN PROPIEDADES</div>
      <div class="cover-sub">Matrícula N° 227 &nbsp;·&nbsp; Corredor Público Inmobiliario &nbsp;·&nbsp; Zona Oeste GBA Argentina</div>
    </div>
  </div>
  <div class="cover-meta">
    <div class="doc-title">Informe de Tasación</div>
    <div>${esc(fecha)}</div>
  </div>
</div>

<div class="body">

  <!-- PROPERTY TITLE -->
  <div class="prop-bar">
    <div class="prop-tipo">Propiedad tasada</div>
    <div class="prop-titulo">${esc(titulo || 'Propiedad')}</div>
  </div>

  <!-- VALUE BOX -->
  <div class="value-box">
    <div class="vb-label">Valor de mercado estimado</div>
    <div class="vb-main">${usd(result.rango_probable)}</div>
    <div class="vb-sub">Valor más probable según el análisis comparativo de mercado</div>
    <div class="vb-grid">
      <div class="vb-item">
        <div class="vi-label">Escenario conservador</div>
        <div class="vi-value">${usd(result.rango_conservador)}</div>
      </div>
      <div class="vb-item">
        <div class="vi-label">Precio de cierre estimado</div>
        <div class="vi-value">${usd(result.cierre_min)} – ${usd(result.cierre_max)}</div>
      </div>
      <div class="vb-item">
        <div class="vi-label">Escenario optimista</div>
        <div class="vi-value">${usd(result.rango_optimista)}</div>
      </div>
    </div>
    ${result.valor_m2_propiedad > 0 ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #c8e6d4;font-size:9.5pt;color:#444">
      Valor estimado por m²: <strong>${Math.round(result.valor_m2_propiedad).toLocaleString('es-AR')} USD/m²</strong>
      ${result.valor_m2_mercado > 0 ? ` &nbsp;·&nbsp; Promedio zona: <strong>${Math.round(result.valor_m2_mercado).toLocaleString('es-AR')} USD/m²</strong>` : ''}
    </div>` : ''}
  </div>

  <!-- SEMÁFORO vs PRECIO PRETENDIDO -->
  ${form.precioPretendido ? `
  <div class="sem-box" style="background:${semaforoBg};border:1.5px solid ${semaforoColor}40">
    <div class="sem-dot" style="background:${semaforoColor}"></div>
    <div>
      <div class="sem-title" style="color:${semaforoColor}">${esc(semaforoLabel)}</div>
      <div class="sem-body">
        El precio pretendido de <strong>USD ${parseFloat(form.precioPretendido).toLocaleString('es-AR')}</strong> está
        <strong>${result.desvio_pct > 0 ? '+' : ''}${result.desvio_pct.toFixed(1)}%</strong>
        ${result.desvio_signo === 'sobrevaluado' ? 'por encima' : result.desvio_signo === 'subvaluado' ? 'por debajo' : 'en línea'}
        del valor de mercado estimado.
        ${result.desvio_signo === 'sobrevaluado' ? 'Un precio de publicación más cercano al valor de mercado facilitará la venta.' : result.desvio_signo === 'subvaluado' ? 'La propiedad ofrece una oportunidad de valor para el comprador.' : 'El precio se encuentra bien posicionado respecto al mercado.'}
      </div>
    </div>
  </div>` : ''}

  <div class="two-col">
    <!-- PROPERTY DETAILS -->
    <div class="section">
      <div class="sh">Datos del inmueble</div>
      <table class="prop-table">
        ${propRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}
      </table>
    </div>

    <!-- CONFIDENCE + VARIABLES -->
    <div>
      <div class="section">
        <div class="sh">Confianza del análisis</div>
        <div class="conf-row">
          <div class="conf-badge" style="background:${result.confianza_pct >= 75 ? '#dcfce7;color:#15803d' : result.confianza_pct >= 50 ? '#fef9c3;color:#92400e' : '#fee2e2;color:#dc2626'}">${esc(result.confianza_nivel)}</div>
          <div class="conf-bar-wrap"><div class="conf-bar" style="width:${result.confianza_pct}%;background:${result.confianza_pct >= 75 ? '#16a34a' : result.confianza_pct >= 50 ? '#d97706' : '#dc2626'}"></div></div>
          <strong>${result.confianza_pct}%</strong>
        </div>
      </div>

      ${result.variables_suben?.length > 0 || result.variables_bajan?.length > 0 ? `
      <div class="section">
        <div class="sh">Factores que impactan el valor</div>
        <div class="chips">
          ${(result.variables_suben ?? []).map((v) => `<span class="chip chip-up">↑ ${esc(v)}</span>`).join('')}
          ${(result.variables_bajan ?? []).map((v) => `<span class="chip chip-down">↓ ${esc(v)}</span>`).join('')}
          ${(result.variables_alerta ?? []).map((v) => `<span class="chip chip-alert">⚠ ${esc(v)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>

  <!-- RECOMENDACIÓN -->
  <div class="sh">Recomendación</div>
  <div class="rec-box">
    <div class="rec-title">${esc(result.recomendacion_titulo)}</div>
    <div class="rec-body">${nl(result.recomendacion_desc)}</div>
  </div>

  <!-- METHODOLOGY NOTE -->
  <div class="sh">Metodología</div>
  <div class="method-box">
    Este informe fue elaborado mediante el <strong>método comparativo de mercado</strong>: se analizaron propiedades similares en la misma zona, se calculó el valor por m² de cada comparable, se aplicaron ajustes por estado, calidad, antigüedad y características específicas, y se determinó un rango de valor para la propiedad.
    ${result.confianza_nota ? `<br><br><em>${esc(result.confianza_nota)}</em>` : ''}
  </div>

  <!-- FOTOGRAFÍAS -->
  ${buildPhotoGrid(form, 'sh')}

  <!-- SIGNATURE -->
  <div class="signature">
    <div class="sig-block">
      <div style="height:44px"></div>
      <div class="sig-line">
        Nazareno Calderón<br>
        Corredor Público Inmobiliario · Mat. 227<br>
        Calderón Propiedades · Zona Oeste GBA
      </div>
    </div>
  </div>

</div>

<!-- DISCLAIMER -->
<div class="disclaimer">
  Los valores indicados son estimativos y fueron determinados con base en comparables de mercado y criterio profesional. No constituyen tasación oficial ni valuación con efectos jurídicos. Los precios son en dólares estadounidenses (USD) de referencia y están sujetos a condiciones de mercado y negociación. &nbsp;·&nbsp; Calderón Propiedades · Mat. 227 · Zona Oeste GBA · ${esc(fecha)}
</div>

<script>
window.addEventListener('load', function () {
  setTimeout(function () { window.print(); }, 900);
});
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=720')
  if (!win) {
    alert('No se pudo abrir la ventana. Desactivá el bloqueador de pop-ups.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
