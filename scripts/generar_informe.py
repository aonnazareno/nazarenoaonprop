#!/usr/bin/env python3
"""
Generador de informes de tasación inmobiliaria en PDF
Calderón Propiedades — Matrícula N° 227

Dependencias:
    pip install reportlab pillow

Uso:
    python generar_informe.py          # genera informe de ejemplo
    from generar_informe import generar_pdf
    generar_pdf(datos)
"""

import os
import random
from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, Image, NextPageTemplate, PageBreak,
    KeepTogether, HRFlowable,
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas as pdfcanvas

# ─── Colores corporativos ────────────────────────────────────────────────────
PRIMARY   = HexColor('#2D3436')   # gris oscuro — títulos de sección
ACCENT    = HexColor('#27AE60')   # verde — destacados y valores
ACCENT_BG = HexColor('#EAF7EF')   # verde muy claro — fondos
LIGHT     = HexColor('#F8F9FA')   # gris casi blanco — filas alternadas
BORDER    = HexColor('#DEE2E6')   # bordes de tabla
MUTED     = HexColor('#6C757D')   # texto secundario
PAGE_W, PAGE_H = A4               # 595.27 × 841.89 pt

# ─── Tipografía ──────────────────────────────────────────────────────────────
MARGIN = 2 * cm

def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles['cover_company'] = ParagraphStyle(
        'cover_company', fontName='Helvetica-Bold',
        fontSize=22, textColor=white, leading=26,
        alignment=TA_LEFT,
    )
    styles['cover_sub'] = ParagraphStyle(
        'cover_sub', fontName='Helvetica',
        fontSize=10, textColor=HexColor('#CCCCCC'), leading=14,
        alignment=TA_LEFT,
    )
    styles['cover_title'] = ParagraphStyle(
        'cover_title', fontName='Helvetica-Bold',
        fontSize=32, textColor=white, leading=38,
        alignment=TA_CENTER, spaceAfter=8,
    )
    styles['cover_address'] = ParagraphStyle(
        'cover_address', fontName='Helvetica',
        fontSize=14, textColor=HexColor('#DDDDDD'), leading=18,
        alignment=TA_CENTER,
    )
    styles['cover_meta'] = ParagraphStyle(
        'cover_meta', fontName='Helvetica',
        fontSize=10, textColor=HexColor('#AAAAAA'), leading=14,
        alignment=TA_CENTER,
    )
    styles['section_title'] = ParagraphStyle(
        'section_title', fontName='Helvetica-Bold',
        fontSize=11, textColor=white, leading=15,
        leftIndent=6, rightIndent=6,
        spaceBefore=4, spaceAfter=0,
    )
    styles['body'] = ParagraphStyle(
        'body', fontName='Helvetica',
        fontSize=9.5, textColor=PRIMARY, leading=14,
        alignment=TA_JUSTIFY,
    )
    styles['body_label'] = ParagraphStyle(
        'body_label', fontName='Helvetica-Bold',
        fontSize=9.5, textColor=PRIMARY, leading=14,
    )
    styles['body_muted'] = ParagraphStyle(
        'body_muted', fontName='Helvetica',
        fontSize=9, textColor=MUTED, leading=13,
    )
    styles['value_main'] = ParagraphStyle(
        'value_main', fontName='Helvetica-Bold',
        fontSize=28, textColor=ACCENT, leading=34,
        alignment=TA_CENTER,
    )
    styles['value_label'] = ParagraphStyle(
        'value_label', fontName='Helvetica-Bold',
        fontSize=9, textColor=MUTED, leading=12,
        alignment=TA_CENTER, spaceBefore=2,
    )
    styles['value_sub'] = ParagraphStyle(
        'value_sub', fontName='Helvetica',
        fontSize=10, textColor=PRIMARY, leading=14,
        alignment=TA_CENTER,
    )
    styles['chip_ok'] = ParagraphStyle(
        'chip_ok', fontName='Helvetica-Bold',
        fontSize=9, textColor=ACCENT, leading=12,
    )
    styles['chip_no'] = ParagraphStyle(
        'chip_no', fontName='Helvetica',
        fontSize=9, textColor=MUTED, leading=12,
    )
    styles['footer'] = ParagraphStyle(
        'footer', fontName='Helvetica',
        fontSize=8, textColor=MUTED, leading=10,
        alignment=TA_CENTER,
    )
    return styles


# ─── Helpers ─────────────────────────────────────────────────────────────────

def fmt_currency(value, moneda='USD'):
    """Formatea número como moneda."""
    if not value:
        return '—'
    return f"{moneda} {value:,.0f}".replace(',', '.')


def fmt_sup(value):
    """Formatea superficie."""
    if not value:
        return '—'
    return f"{value:,.0f} m²".replace(',', '.')


def numero_informe():
    """Genera número de informe: CP-YYYYMMDD-XXX."""
    hoy = datetime.now().strftime('%Y%m%d')
    seq = random.randint(100, 999)
    return f"CP-{hoy}-{seq}"


def load_logo(path, width=3*cm, height=1.5*cm):
    """Carga el logo; devuelve None si no existe."""
    if not path or not os.path.exists(path):
        return None
    try:
        return Image(path, width=width, height=height)
    except Exception:
        return None


# ─── Flowable personalizado: SectionHeader ────────────────────────────────────

class SectionHeader(Flowable):
    """Barra de título de sección con fondo PRIMARY y texto blanco."""

    def __init__(self, text, styles, width=None):
        super().__init__()
        self.text = text
        self.styles = styles
        self._width = width or (PAGE_W - 2 * MARGIN)
        self.height = 22

    def wrap(self, avail_w, avail_h):
        self.width = self._width or avail_w
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(PRIMARY)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(8, 6, self.text.upper())


# ─── Flowable personalizado: ValorBox ────────────────────────────────────────

class ValorBox(Flowable):
    """Recuadro destacado verde para el valor de tasación."""

    def __init__(self, valor_tecnico, valor_mercado, moneda, apto_credito, styles):
        super().__init__()
        self.vt = valor_tecnico
        self.vm = valor_mercado
        self.moneda = moneda
        self.apto = apto_credito
        self.styles = styles
        self.height = 120

    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        return self.width, self.height

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Outer border
        c.setStrokeColor(ACCENT)
        c.setLineWidth(2.5)
        c.roundRect(0, 0, w, h, 6, fill=0, stroke=1)

        # Inner background
        c.setFillColor(ACCENT_BG)
        c.setLineWidth(0)
        c.roundRect(2, 2, w - 4, h - 4, 5, fill=1, stroke=0)

        # Divider line
        half = w / 2
        c.setStrokeColor(BORDER)
        c.setLineWidth(1)
        c.line(half, 10, half, h - 10)

        # Left: valor técnico
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(MUTED)
        c.drawCentredString(half / 2, h - 20, 'VALOR TÉCNICO')
        c.setFont('Helvetica-Bold', 24)
        c.setFillColor(PRIMARY)
        c.drawCentredString(half / 2, h - 55, fmt_currency(self.vt, self.moneda))

        # Right: valor de mercado (destacado)
        c.setFont('Helvetica-Bold', 9)
        c.setFillColor(MUTED)
        c.drawCentredString(half + half / 2, h - 20, 'VALOR DE MERCADO')
        c.setFont('Helvetica-Bold', 28)
        c.setFillColor(ACCENT)
        c.drawCentredString(half + half / 2, h - 58, fmt_currency(self.vm, self.moneda))

        # Bottom: apto crédito + moneda
        c.setFont('Helvetica', 9)
        c.setFillColor(MUTED)
        credito_txt = '✓ Apto crédito hipotecario' if self.apto else '✗ No apto crédito hipotecario'
        credito_color = ACCENT if self.apto else MUTED
        c.setFillColor(credito_color)
        c.drawCentredString(w / 2, 14, credito_txt)


# ─── Callbacks de página ─────────────────────────────────────────────────────

def make_page_callback(report_num, fecha_str, logo_path=None):
    """Devuelve una función onPage con los datos del informe."""

    def on_page(c, doc):
        """Dibuja header y footer en cada página de contenido."""
        c.saveState()
        page_w = PAGE_W
        top = PAGE_H - MARGIN + 0.3 * cm

        # Header line
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.2)
        c.line(MARGIN, top - 2, page_w - MARGIN, top - 2)

        # Logo o texto de empresa
        logo = load_logo(logo_path, width=2.2 * cm, height=1.1 * cm)
        if logo:
            logo.drawOn(c, MARGIN, top - 1.4 * cm)
        else:
            c.setFont('Helvetica-Bold', 11)
            c.setFillColor(PRIMARY)
            c.drawString(MARGIN, top - 10, 'CALDERÓN PROPIEDADES')
            c.setFont('Helvetica', 8)
            c.setFillColor(MUTED)
            c.drawString(MARGIN, top - 22, 'Matrícula N° 227')

        # Report number (right)
        c.setFont('Helvetica', 8)
        c.setFillColor(MUTED)
        c.drawRightString(page_w - MARGIN, top - 10, report_num)
        c.drawRightString(page_w - MARGIN, top - 22, fecha_str)

        # Footer line
        bot = MARGIN - 0.35 * cm
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.8)
        c.line(MARGIN, bot + 10, page_w - MARGIN, bot + 10)

        c.setFont('Helvetica', 8)
        c.setFillColor(MUTED)
        c.drawString(MARGIN, bot - 2, 'Informe de Tasación Inmobiliaria')
        c.drawCentredString(page_w / 2, bot - 2, f'Página {doc.page}')
        c.drawRightString(page_w - MARGIN, bot - 2, fecha_str)

        c.restoreState()

    return on_page


def cover_page_callback(datos, report_num, fecha_str, logo_path=None):
    """Dibuja la portada completa (sin header/footer estándar)."""

    def on_cover(c, doc):
        c.saveState()
        w, h = PAGE_W, PAGE_H

        # Fondo oscuro — mitad superior
        c.setFillColor(PRIMARY)
        c.rect(0, h * 0.45, w, h * 0.55, fill=1, stroke=0)

        # Franja de acento inferior del banner
        c.setFillColor(ACCENT)
        c.rect(0, h * 0.45, w, 0.6 * cm, fill=1, stroke=0)

        # Logo o nombre empresa — arriba izquierda
        logo = load_logo(logo_path, width=4 * cm, height=2 * cm)
        if logo:
            logo.drawOn(c, MARGIN + 0.5 * cm, h - MARGIN - 2.5 * cm)
        else:
            c.setFont('Helvetica-Bold', 20)
            c.setFillColor(white)
            c.drawString(MARGIN + 0.5 * cm, h - MARGIN - 1 * cm, 'CALDERÓN PROPIEDADES')
            c.setFont('Helvetica', 10)
            c.setFillColor(HexColor('#AAAAAA'))
            c.drawString(MARGIN + 0.5 * cm, h - MARGIN - 1.8 * cm, 'Matrícula N° 227  ·  Corredor Público Inmobiliario')

        # Título central
        c.setFont('Helvetica-Bold', 36)
        c.setFillColor(white)
        c.drawCentredString(w / 2, h * 0.62, 'INFORME DE')
        c.setFont('Helvetica-Bold', 36)
        c.setFillColor(ACCENT)
        c.drawCentredString(w / 2, h * 0.55, 'TASACIÓN')

        # Tipo de inmueble
        c.setFont('Helvetica', 13)
        c.setFillColor(HexColor('#BBBBBB'))
        c.drawCentredString(w / 2, h * 0.49, datos.get('tipo_inmueble', '').upper())

        # Parte inferior — fondo blanco
        # Dirección
        c.setFont('Helvetica-Bold', 14)
        c.setFillColor(PRIMARY)
        direccion = datos.get('direccion', '')
        localidad = datos.get('localidad', '')
        partido = datos.get('partido', '')
        loc_str = ', '.join(filter(None, [localidad, partido]))
        c.drawCentredString(w / 2, h * 0.40, direccion)
        c.setFont('Helvetica', 11)
        c.setFillColor(MUTED)
        c.drawCentredString(w / 2, h * 0.36, loc_str)

        # Separador
        c.setStrokeColor(BORDER)
        c.setLineWidth(1)
        c.line(MARGIN * 3, h * 0.32, w - MARGIN * 3, h * 0.32)

        # Metadata — solicitante y fecha
        c.setFont('Helvetica', 10)
        c.setFillColor(MUTED)
        solicitante = datos.get('solicitante_nombre', '')
        if solicitante:
            c.drawCentredString(w / 2, h * 0.28, f'Solicitante: {solicitante}')

        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(PRIMARY)
        c.drawCentredString(w / 2, h * 0.23, report_num)
        c.setFont('Helvetica', 10)
        c.setFillColor(MUTED)
        c.drawCentredString(w / 2, h * 0.19, fecha_str)

        # Confidencial
        c.setFont('Helvetica', 8.5)
        c.setFillColor(MUTED)
        c.drawCentredString(w / 2, MARGIN, 'Documento confidencial — Uso exclusivo del solicitante')

        c.restoreState()

    return on_cover


# ─── Tablas de datos ──────────────────────────────────────────────────────────

def tabla_datos(filas, col_widths=None, styles_obj=None):
    """
    Tabla de dos columnas: etiqueta | valor
    filas: [(label, value), ...]
    """
    disponible = PAGE_W - 2 * MARGIN
    col_widths = col_widths or [disponible * 0.38, disponible * 0.62]

    data = []
    for label, value in filas:
        data.append([
            Paragraph(str(label), styles_obj['body_label']),
            Paragraph(str(value) if value else '—', styles_obj['body']),
        ])

    t = Table(data, colWidths=col_widths, hAlign='LEFT')
    ts = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ])
    t.setStyle(ts)
    return t


def tabla_comparables(comparables, moneda, styles_obj):
    """Tabla de comparables de mercado."""
    disponible = PAGE_W - 2 * MARGIN
    col_w = [
        disponible * 0.28,
        disponible * 0.10,
        disponible * 0.10,
        disponible * 0.14,
        disponible * 0.14,
        disponible * 0.24,
    ]

    headers = ['Dirección', 'Sup. Terreno', 'Sup. Cubierta',
               'Precio Publicado', 'Precio Ajustado', 'Observaciones']

    h_row = [Paragraph(h, ParagraphStyle(
        'th', fontName='Helvetica-Bold', fontSize=8.5,
        textColor=white, alignment=TA_CENTER
    )) for h in headers]

    data = [h_row]
    for comp in comparables:
        data.append([
            Paragraph(comp.get('direccion', '—'), styles_obj['body']),
            Paragraph(fmt_sup(comp.get('sup_terreno')), styles_obj['body_muted']),
            Paragraph(fmt_sup(comp.get('sup_cubierta')), styles_obj['body_muted']),
            Paragraph(fmt_currency(comp.get('precio_publicado'), moneda), styles_obj['body']),
            Paragraph(fmt_currency(comp.get('precio_ajustado'), moneda),
                      ParagraphStyle('va', fontName='Helvetica-Bold', fontSize=9.5,
                                     textColor=ACCENT, alignment=TA_LEFT)),
            Paragraph(comp.get('observaciones', '—'), styles_obj['body_muted']),
        ])

    t = Table(data, colWidths=col_w, hAlign='LEFT', repeatRows=1)
    ts = TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        # Rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 1), (4, -1), 'CENTER'),
    ])
    t.setStyle(ts)
    return t


def grilla_fotos(rutas, styles_obj):
    """Grilla 2×N de fotos."""
    disponible = PAGE_W - 2 * MARGIN
    foto_w = (disponible - 0.5 * cm) / 2
    foto_h = foto_w * 0.67

    flowables = []
    pares = [rutas[i:i+2] for i in range(0, len(rutas), 2)]

    for par in pares:
        row = []
        for ruta in par:
            try:
                img = Image(ruta, width=foto_w, height=foto_h)
                img.hAlign = 'CENTER'
                row.append(img)
            except Exception:
                # Placeholder si la imagen no se puede cargar
                row.append(Paragraph(
                    f'[Foto no disponible]<br/><font size="8">{os.path.basename(ruta)}</font>',
                    ParagraphStyle('ph', fontName='Helvetica', fontSize=9,
                                   textColor=MUTED, alignment=TA_CENTER)
                ))
        while len(row) < 2:
            row.append(Paragraph('', styles_obj['body']))

        t = Table([row], colWidths=[foto_w, foto_w], hAlign='LEFT')
        t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('COLPADDING', (0, 0), (-1, -1), 4),
        ]))
        flowables.append(t)
        flowables.append(Spacer(1, 0.3 * cm))

    return flowables


# ─── Builder principal ────────────────────────────────────────────────────────

def generar_pdf(datos: dict, output_path: str = None) -> str:
    """
    Genera el informe PDF a partir del diccionario `datos`.
    Devuelve la ruta del archivo generado.
    """
    styles = build_styles()
    fecha_str = datetime.now().strftime('%d/%m/%Y')
    report_num = numero_informe()
    moneda = datos.get('moneda', 'USD')
    logo_path = datos.get('logo_path')  # PLACEHOLDER

    # Nombre del archivo de salida
    if not output_path:
        dir_safe = datos.get('direccion', 'propiedad').replace(' ', '_').replace('/', '-')[:40]
        fecha_file = datetime.now().strftime('%Y%m%d')
        output_path = f"Tasacion_{dir_safe}_{fecha_file}.pdf"

    # ── Configuración del documento ──────────────────────────────────────────
    content_callback = make_page_callback(report_num, fecha_str, logo_path)
    cover_callback   = cover_page_callback(datos, report_num, fecha_str, logo_path)

    doc = BaseDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN + 1.2 * cm,
        bottomMargin=MARGIN + 0.8 * cm,
    )

    # Frames
    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0,
                        rightPadding=0, topPadding=0, bottomPadding=0)
    content_frame = Frame(
        MARGIN, MARGIN + 0.8 * cm,
        PAGE_W - 2 * MARGIN,
        PAGE_H - 2 * MARGIN - 2 * cm,
        leftPadding=0, rightPadding=0,
    )

    doc.addPageTemplates([
        PageTemplate(id='cover',   frames=[cover_frame], onPage=cover_callback),
        PageTemplate(id='content', frames=[content_frame], onPage=content_callback),
    ])

    # ── Contenido ────────────────────────────────────────────────────────────
    story = []

    # ─ 1. PORTADA ─────────────────────────────────────────────────────────
    story.append(NextPageTemplate('content'))
    story.append(PageBreak())  # la portada la dibuja cover_callback; avanzamos a content

    # ─ 2. DATOS DEL SOLICITANTE ───────────────────────────────────────────
    story.append(SectionHeader('2. Datos del solicitante', styles))
    story.append(Spacer(1, 0.25 * cm))
    story.append(tabla_datos([
        ('Nombre / Razón social', datos.get('solicitante_nombre')),
        ('Teléfono de contacto',  datos.get('solicitante_telefono')),
        ('Motivo de la tasación', datos.get('motivo_tasacion', '').capitalize()),
        ('Número de informe',     report_num),
        ('Fecha de emisión',      fecha_str),
    ], styles_obj=styles))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 3. IDENTIFICACIÓN DEL INMUEBLE ─────────────────────────────────────
    story.append(SectionHeader('3. Identificación del inmueble', styles))
    story.append(Spacer(1, 0.25 * cm))
    story.append(tabla_datos([
        ('Dirección',                datos.get('direccion')),
        ('Localidad',                datos.get('localidad')),
        ('Partido',                  datos.get('partido')),
        ('Nomenclatura catastral',   datos.get('nomenclatura_catastral')),
        ('Partida inmobiliaria',     datos.get('partida_inmobiliaria')),
        ('Zonificación',             datos.get('zonificacion')),
    ], styles_obj=styles))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 4. DESCRIPCIÓN FÍSICA ──────────────────────────────────────────────
    story.append(SectionHeader('4. Descripción física del inmueble', styles))
    story.append(Spacer(1, 0.25 * cm))
    story.append(tabla_datos([
        ('Tipo de inmueble',       datos.get('tipo_inmueble', '').capitalize()),
        ('Superficie del terreno', fmt_sup(datos.get('sup_terreno'))),
        ('Superficie cubierta',    fmt_sup(datos.get('sup_cubierta'))),
        ('Superficie semicubierta',fmt_sup(datos.get('sup_semicubierta'))),
        ('Antigüedad',             f"{datos.get('antiguedad', 0)} años"),
        ('Estado de conservación', datos.get('estado_conservacion', '').capitalize()),
        ('Orientación',            datos.get('orientacion')),
        ('Ambientes',              str(datos.get('ambientes', 0))),
        ('Dormitorios',            str(datos.get('dormitorios', 0))),
        ('Baños',                  str(datos.get('banos', 0))),
        ('Cochera',                'Sí' if datos.get('cochera') else 'No'),
    ], styles_obj=styles))
    if datos.get('descripcion_adicional'):
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(
            f"<b>Descripción adicional:</b> {datos['descripcion_adicional']}",
            styles['body']
        ))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 5. SERVICIOS E INFRAESTRUCTURA ─────────────────────────────────────
    story.append(SectionHeader('5. Servicios e infraestructura', styles))
    story.append(Spacer(1, 0.25 * cm))

    servicios_todos = [
        'agua corriente', 'gas natural', 'luz', 'cloaca',
        'pavimento', 'telefonía', 'internet', 'alumbrado público',
    ]
    servicios_prop = [s.lower() for s in datos.get('servicios', [])]

    serv_data = []
    row = []
    for i, s in enumerate(servicios_todos):
        tiene = s in servicios_prop
        icono = '✓' if tiene else '✗'
        estilo = styles['chip_ok'] if tiene else styles['chip_no']
        row.append(Paragraph(f"{icono}  {s.capitalize()}", estilo))
        if len(row) == 4:
            serv_data.append(row)
            row = []
    if row:
        while len(row) < 4:
            row.append(Paragraph('', styles['body']))
        serv_data.append(row)

    disponible = PAGE_W - 2 * MARGIN
    t_serv = Table(serv_data, colWidths=[disponible / 4] * 4, hAlign='LEFT')
    t_serv.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_serv)
    story.append(Spacer(1, 0.5 * cm))

    # ─ 6. ANÁLISIS DE ZONA / ENTORNO ──────────────────────────────────────
    story.append(SectionHeader('6. Análisis de zona y entorno', styles))
    story.append(Spacer(1, 0.25 * cm))
    desc_zona = datos.get('descripcion_zona') or 'Sin descripción de zona.'
    story.append(Paragraph(desc_zona, styles['body']))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 7. COMPARABLES DE MERCADO ──────────────────────────────────────────
    comparables = datos.get('comparables', [])
    story.append(SectionHeader(f'7. Comparables de mercado ({len(comparables)} referencia{"s" if len(comparables) != 1 else ""})', styles))
    story.append(Spacer(1, 0.25 * cm))
    if comparables:
        story.append(tabla_comparables(comparables, moneda, styles))
    else:
        story.append(Paragraph('No se registraron comparables de mercado para este informe.', styles['body_muted']))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 8. METODOLOGÍA ─────────────────────────────────────────────────────
    story.append(SectionHeader('8. Metodología de valuación', styles))
    story.append(Spacer(1, 0.25 * cm))
    metodologia = datos.get('metodologia') or (
        'Se aplicó el método comparativo de mercado, analizando propiedades similares '
        'en la zona, ajustando por superficie, estado, antigüedad y características '
        'particulares de la propiedad.'
    )
    story.append(Paragraph(metodologia, styles['body']))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 9. VALOR DETERMINADO ───────────────────────────────────────────────
    story.append(SectionHeader('9. Valor determinado', styles))
    story.append(Spacer(1, 0.35 * cm))
    story.append(KeepTogether([
        ValorBox(
            datos.get('valor_tecnico', 0),
            datos.get('valor_mercado', 0),
            moneda,
            datos.get('apto_credito', False),
            styles,
        )
    ]))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 10. OBSERVACIONES / CONDICIONANTES ─────────────────────────────────
    story.append(SectionHeader('10. Observaciones y condicionantes', styles))
    story.append(Spacer(1, 0.25 * cm))
    obs = datos.get('observaciones') or 'Sin observaciones adicionales.'
    story.append(Paragraph(obs, styles['body']))
    story.append(Spacer(1, 0.5 * cm))

    # ─ 11. CONCLUSIÓN Y FIRMA DEL TASADOR ─────────────────────────────────
    story.append(SectionHeader('11. Conclusión y firma del tasador', styles))
    story.append(Spacer(1, 0.3 * cm))

    tasador  = datos.get('tasador_nombre', 'Nazareno Calderón')
    matricula = datos.get('tasador_matricula', '227')
    vigencia = datos.get('fecha_vigencia', datetime.now().strftime('%m/%Y'))

    story.append(Paragraph(
        f'El suscripto, <b>{tasador}</b>, Corredor Público Inmobiliario, Matrícula N° {matricula}, '
        f'certifica que la presente tasación fue realizada con metodología profesional y refleja '
        f'los valores de mercado vigentes a la fecha de emisión del informe, siendo su vigencia '
        f'hasta el <b>{vigencia}</b>, sujeto a variaciones del mercado inmobiliario.',
        styles['body']
    ))
    story.append(Spacer(1, 1.5 * cm))

    # Línea de firma
    disponible = PAGE_W - 2 * MARGIN
    firma_data = [[
        Paragraph('', styles['body']),
        Paragraph(
            f'_______________________________<br/>'
            f'<b>{tasador}</b><br/>'
            f'Corredor Público Inmobiliario<br/>'
            f'Matrícula N° {matricula}<br/>'
            f'Calderón Propiedades',
            ParagraphStyle('firma', fontName='Helvetica', fontSize=9,
                           textColor=PRIMARY, alignment=TA_CENTER, leading=14)
        ),
    ]]
    t_firma = Table(firma_data, colWidths=[disponible * 0.5, disponible * 0.5])
    t_firma.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_firma)

    # ─ 12. ANEXO FOTOGRÁFICO ──────────────────────────────────────────────
    fotos = datos.get('fotos', [])
    if fotos:
        story.append(PageBreak())
        story.append(SectionHeader('12. Anexo fotográfico', styles))
        story.append(Spacer(1, 0.35 * cm))
        story.extend(grilla_fotos(fotos, styles))

    # ── Build ─────────────────────────────────────────────────────────────
    doc.build(story)
    return output_path


# ─── Ejemplo de uso ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    datos_ejemplo = {
        # Solicitante
        'solicitante_nombre':   'María García',
        'solicitante_telefono': '+54 11 9999-0000',
        'motivo_tasacion':      'venta',

        # Logo (PLACEHOLDER — reemplazar con ruta real)
        'logo_path': None,

        # Identificación del inmueble
        'direccion':              'Av. San Martín 1234',
        'partido':                'Moreno',
        'localidad':              'Moreno',
        'nomenclatura_catastral': '18-04-023-0001-0001/0000',
        'partida_inmobiliaria':   '18-0234567-0',
        'zonificacion':           'R1 — Residencial unifamiliar',

        # Descripción física
        'tipo_inmueble':          'casa',
        'sup_terreno':            350,
        'sup_cubierta':           180,
        'sup_semicubierta':       20,
        'antiguedad':             15,
        'estado_conservacion':    'muy bueno',
        'orientacion':            'Norte',
        'ambientes':              5,
        'dormitorios':            3,
        'banos':                  2,
        'cochera':                True,
        'descripcion_adicional':  (
            'Propiedad con jardín al frente y fondo, quincho con parrilla, '
            'pileta de natación. Cocina amplia con acceso al patio trasero.'
        ),

        # Servicios
        'servicios': ['agua corriente', 'gas natural', 'luz', 'cloaca',
                      'pavimento', 'alumbrado público'],

        # Zona
        'descripcion_zona': (
            'El inmueble se encuentra ubicado sobre avenida de alto tránsito, '
            'con acceso directo a transporte público y a 800 metros del centro '
            'comercial de Moreno. La zona es predominantemente residencial, con '
            'presencia de comercios en planta baja sobre la avenida. '
            'Se observa crecimiento en la valuación de propiedades de la zona '
            'en los últimos 18 meses, con incrementos promedio del 8-12% anual '
            'en dólares.'
        ),

        # Comparables
        'comparables': [
            {
                'direccion':        'Mitre 890, Moreno',
                'sup_terreno':      300,
                'sup_cubierta':     170,
                'precio_publicado': 185000,
                'precio_ajustado':  178000,
                'observaciones':    'Venta directa, sin cochera, estado bueno',
            },
            {
                'direccion':        'Belgrano 2345, Moreno',
                'sup_terreno':      400,
                'sup_cubierta':     200,
                'precio_publicado': 230000,
                'precio_ajustado':  210000,
                'observaciones':    'Mayor terreno; se ajusta por superficie excedente',
            },
            {
                'direccion':        'Sarmiento 567, Moreno',
                'sup_terreno':      320,
                'sup_cubierta':     165,
                'precio_publicado': 175000,
                'precio_ajustado':  175000,
                'observaciones':    'Referencia más comparable; estado muy bueno',
            },
            {
                'direccion':        'Brown 1100, Moreno',
                'sup_terreno':      360,
                'sup_cubierta':     185,
                'precio_publicado': 195000,
                'precio_ajustado':  190000,
                'observaciones':    'Con pileta; se descuenta mejora específica',
            },
        ],

        # Metodología
        'metodologia': (
            'Se utilizó el método comparativo directo de mercado (MCDM), '
            'analizando cuatro propiedades en venta de características similares '
            'en un radio de 600 metros. Se ajustaron los precios por diferencias '
            'en superficie cubierta (±2% por cada 10 m²), estado de conservación '
            '(hasta ±8%), presencia de amenities (±3-5%) y ubicación relativa '
            '(±5%). El valor resultante surge del promedio ponderado de los '
            'comparables ajustados, con mayor peso a las transacciones más '
            'recientes y comparables de mayor similitud.'
        ),

        # Valores
        'valor_tecnico':  195000,
        'valor_mercado':  190000,
        'apto_credito':   True,
        'moneda':         'USD',

        # Observaciones
        'observaciones': (
            'La tasación tiene vigencia de 90 días a partir de la fecha de '
            'emisión. Los valores son de referencia en dólares estadounidenses '
            'y pueden verse afectados por variaciones del tipo de cambio y '
            'condiciones del mercado local. Se recomienda validar el precio '
            'final con el corredor interviniente al momento de la operación.'
        ),

        # Tasador
        'tasador_nombre':   'Nazareno Calderón',
        'tasador_matricula': '227',
        'fecha_vigencia':   (
            datetime.now().replace(month=datetime.now().month % 12 + 1).strftime('%m/%Y')
        ),

        # Fotos (PLACEHOLDER — reemplazar con rutas reales)
        'fotos': [],
    }

    archivo = generar_pdf(datos_ejemplo)
    print(f'✓ Informe generado: {archivo}')
