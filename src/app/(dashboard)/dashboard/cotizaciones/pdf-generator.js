// =============================================================================
// GREENLAND — Premium Quotation PDF Generator
// Uses jsPDF v4.2.0 (dynamic import, built-in helvetica)
// =============================================================================

// ---------------------------------------------------------------------------
// Brand configurations
// ---------------------------------------------------------------------------
const BRAND_CONFIG = {
  spaces: {
    primary: '#2d7d46',
    accent: '#a8d060',
    title: 'GREENLAND SPACES',
    logo: '/Greenland Spaces logo.png',
    icon: '/greenland_spaces_v2_ICONO.png',
    primaryRGB: [45, 125, 70],
    accentRGB: [168, 208, 96],
  },
  products: {
    primary: '#6a9a04',
    accent: '#dee24b',
    title: 'GREENLAND PRODUCTS',
    logo: '/greenland-logo.png',
    icon: null,
    primaryRGB: [106, 154, 4],
    accentRGB: [222, 228, 75],
  },
  deco: {
    primary: '#5a8a3c',
    accent: '#8fbc5a',
    title: 'GREENLAND DECO',
    logo: '/Greenland Deco logo.png',
    icon: '/greenland_deco_v2_ICONO.png',
    primaryRGB: [90, 138, 60],
    accentRGB: [143, 188, 90],
  },
};

// ---------------------------------------------------------------------------
// Page constants (Letter size in mm)
// ---------------------------------------------------------------------------
const PAGE = {
  width: 215.9,
  height: 279.4,
  marginLeft: 18,
  marginRight: 18,
  marginTop: 10,
  marginBottom: 22,
};
PAGE.contentWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

// ---------------------------------------------------------------------------
// Helper — load image from public path as base64 data URL
// ---------------------------------------------------------------------------
const loadImage = async (path) => {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Helper — format currency value
// ---------------------------------------------------------------------------
const fmtCurrency = (value, currency = 'MXN') => {
  const prefix = currency === 'USD' ? 'US$' : '$';
  const num = Number(value) || 0;
  return `${prefix} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ---------------------------------------------------------------------------
// Helper — parse hex colour to [r, g, b]
// ---------------------------------------------------------------------------
const hexToRGB = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
};

// ---------------------------------------------------------------------------
// Helper — lighten a colour toward white
// ---------------------------------------------------------------------------
const lighten = ([r, g, b], amount = 0.85) => [
  Math.round(r + (255 - r) * amount),
  Math.round(g + (255 - g) * amount),
  Math.round(b + (255 - b) * amount),
];

// ---------------------------------------------------------------------------
// Helper — draw the footer on the current page
// ---------------------------------------------------------------------------
function drawFooter(doc, brand, pageNum, totalPages) {
  const y = PAGE.height - PAGE.marginBottom + 4;

  // Thin brand-colour line
  doc.setDrawColor(...brand.primaryRGB);
  doc.setLineWidth(0.6);
  doc.line(PAGE.marginLeft, y, PAGE.width - PAGE.marginRight, y);

  // Company info — centered
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);

  const line1 = 'GREENLAND PRODUCTS S.A. DE C.V.';
  const line2 = 'Blvd. Vito Alessio Robles N\u00B0 3550 Int #9, Col. Nazario Ortiz Garza C.P. 25100, Saltillo, Coahuila';
  const line3 = 'Tel. (844) 105 8692  |  ventas@greenland-products.com.mx';

  const cx = PAGE.width / 2;
  doc.text(line1, cx, y + 4, { align: 'center' });
  doc.text(line2, cx, y + 7.5, { align: 'center' });
  doc.text(line3, cx, y + 11, { align: 'center' });

  // Page number — right aligned
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `P\u00E1gina ${pageNum} de ${totalPages}`,
    PAGE.width - PAGE.marginRight,
    y + 14,
    { align: 'right' },
  );
}

// ---------------------------------------------------------------------------
// Helper — add a new page and return starting Y
// ---------------------------------------------------------------------------
function addPage(doc, brand) {
  doc.addPage();
  // We draw a thin accent strip at the very top of continuation pages
  doc.setFillColor(...brand.primaryRGB);
  doc.rect(0, 0, PAGE.width, 3, 'F');
  return PAGE.marginTop + 6;
}

// ---------------------------------------------------------------------------
// Helper — ensure there is enough room; if not, add a page
// ---------------------------------------------------------------------------
function ensureSpace(doc, y, needed, brand) {
  const maxY = PAGE.height - PAGE.marginBottom;
  if (y + needed > maxY) {
    return addPage(doc, brand);
  }
  return y;
}

// ---------------------------------------------------------------------------
// Helper — draw rounded rectangle
// ---------------------------------------------------------------------------
function roundedRect(doc, x, y, w, h, r, style) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

// =============================================================================
// MAIN EXPORT
// =============================================================================
export default async function generateQuotationPDF(quotationData) {
  const { quotation, items = [] } = quotationData;
  const { jsPDF } = await import('jspdf');

  // Resolve brand
  const brandKey = (quotation.brand || 'products').toLowerCase();
  const brand = BRAND_CONFIG[brandKey] || BRAND_CONFIG.products;

  // Create document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // ------ Load logo ------
  const logoData = await loadImage(brand.logo);

  // We'll track the current Y position
  let y = PAGE.marginTop;

  // =========================================================================
  // 1. HEADER BAR
  // =========================================================================
  const headerH = 28;

  // Gradient-like effect: primary colour bar + subtle accent overlay
  doc.setFillColor(...brand.primaryRGB);
  doc.rect(0, 0, PAGE.width, headerH, 'F');

  // Accent strip at the bottom of the header for depth
  doc.setFillColor(...brand.accentRGB);
  doc.rect(0, headerH - 2.5, PAGE.width, 2.5, 'F');

  // Logo on the left
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', PAGE.marginLeft, 4, 50, 20);
    } catch {
      // fallback: just print brand name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(brand.title, PAGE.marginLeft, 17);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(brand.title, PAGE.marginLeft, 17);
  }

  // Right side — folio, date, validity (white text)
  const rx = PAGE.width - PAGE.marginRight;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Folio: ${quotation.folio || '—'}`, rx, 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const dateStr = quotation.quote_date
    ? new Date(quotation.quote_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  doc.text(`Fecha: ${dateStr}`, rx, 14, { align: 'right' });

  if (quotation.validity_days) {
    doc.text(`Vigencia: ${quotation.validity_days} d\u00EDas`, rx, 19, { align: 'right' });
  }

  // Currency badge
  if (quotation.currency) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const badgeText = `Moneda: ${quotation.currency}`;
    doc.text(badgeText, rx, 24, { align: 'right' });
  }

  y = headerH + 8;

  // =========================================================================
  // 2. TITLE — "COTIZACIÓN"
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...brand.primaryRGB);
  doc.text('COTIZACI\u00D3N', PAGE.marginLeft, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text(brand.title, PAGE.marginLeft, y + 6);

  y += 14;

  // =========================================================================
  // 3. CLIENT INFO BLOCK
  // =========================================================================
  const clientBlockX = PAGE.marginLeft;
  const clientBlockW = PAGE.contentWidth;
  const clientLines = [];

  if (quotation.client_name) clientLines.push({ label: 'Cliente', value: quotation.client_name, bold: true });
  if (quotation.client_company) clientLines.push({ label: 'Empresa', value: quotation.client_company });
  if (quotation.city) clientLines.push({ label: 'Ciudad', value: quotation.city });
  if (quotation.client_phone) clientLines.push({ label: 'Tel\u00E9fono', value: quotation.client_phone });
  if (quotation.client_email) clientLines.push({ label: 'Email', value: quotation.client_email });

  const clientBlockH = Math.max(clientLines.length * 6 + 8, 24);

  // Light gray rounded box
  doc.setFillColor(245, 246, 248);
  roundedRect(doc, clientBlockX, y, clientBlockW, clientBlockH, 3, 'F');

  // Thin left accent bar
  doc.setFillColor(...brand.primaryRGB);
  doc.rect(clientBlockX, y + 2, 2, clientBlockH - 4, 'F');

  let cy = y + 7;
  clientLines.forEach((cl) => {
    doc.setFont('helvetica', cl.bold ? 'bold' : 'normal');
    doc.setFontSize(cl.bold ? 10.5 : 9);
    doc.setTextColor(cl.bold ? 40 : 80, cl.bold ? 40 : 80, cl.bold ? 40 : 80);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${cl.label}:`, clientBlockX + 7, cy);

    doc.setFont('helvetica', cl.bold ? 'bold' : 'normal');
    doc.setFontSize(cl.bold ? 10.5 : 9);
    doc.setTextColor(cl.bold ? 30 : 60, cl.bold ? 30 : 60, cl.bold ? 30 : 60);
    doc.text(cl.value, clientBlockX + 32, cy);

    cy += 6;
  });

  y += clientBlockH + 6;

  // =========================================================================
  // 4. INTRO PARAGRAPH
  // =========================================================================
  if (quotation.intro_text) {
    y = ensureSpace(doc, y, 20, brand);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const introLines = doc.splitTextToSize(quotation.intro_text, PAGE.contentWidth - 4);
    doc.text(introLines, PAGE.marginLeft + 2, y);
    y += introLines.length * 4.2 + 6;
  }

  // =========================================================================
  // 5. PRODUCTS TABLE
  // =========================================================================
  // Column definitions (x offsets relative to marginLeft, widths)
  const cols = [
    { label: 'No.',               x: 0,     w: 12,  align: 'center' },
    { label: 'Descripci\u00F3n',  x: 12,    w: 91,  align: 'left' },
    { label: 'Precio Unit.',      x: 103,   w: 30,  align: 'right' },
    { label: 'Cant.',             x: 133,   w: 18,  align: 'center' },
    { label: 'Total',             x: 151,   w: 29,  align: 'right' },
  ];
  const tableW = 180; // total width of the table
  const tableX = PAGE.marginLeft;
  const rowPadY = 3; // vertical padding inside row

  // ---- Table header ----
  y = ensureSpace(doc, y, 14, brand);

  const headerRowH = 9;
  doc.setFillColor(...brand.primaryRGB);
  roundedRect(doc, tableX, y, tableW, headerRowH, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  cols.forEach((col) => {
    const tx = col.align === 'right'
      ? tableX + col.x + col.w - 2
      : col.align === 'center'
        ? tableX + col.x + col.w / 2
        : tableX + col.x + 3;
    doc.text(col.label, tx, y + 6, { align: col.align });
  });

  y += headerRowH;

  // ---- Table rows ----
  const sortedItems = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const lightBg = lighten(brand.primaryRGB, 0.93);

  sortedItems.forEach((item, idx) => {
    // Prepare description text (name + description)
    let descText = item.name || '';
    if (item.description) {
      descText += descText ? `\n${item.description}` : item.description;
    }
    if (item.sku) {
      descText += descText ? `\nSKU: ${item.sku}` : `SKU: ${item.sku}`;
    }

    const descMaxW = cols[1].w - 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(descText, descMaxW);
    const lineH = 3.8;
    const rowH = Math.max(descLines.length * lineH + rowPadY * 2, 10);

    // Check space
    y = ensureSpace(doc, y, rowH + 1, brand);

    // Alternating background
    if (idx % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }

    // Thin bottom border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);

    const textY = y + rowPadY + 3.5;

    // No.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(String(idx + 1), tableX + cols[0].x + cols[0].w / 2, textY, { align: 'center' });

    // Description (multi-line)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    // First line bold (product name), rest normal
    if (item.name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const nameLines = doc.splitTextToSize(item.name, descMaxW);
      doc.text(nameLines, tableX + cols[1].x + 3, textY);
      const nameHeight = nameLines.length * lineH;

      // Additional description below
      if (item.description || item.sku) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        let extraText = item.description || '';
        if (item.sku) extraText += (extraText ? '  |  ' : '') + `SKU: ${item.sku}`;
        const extraLines = doc.splitTextToSize(extraText, descMaxW);
        doc.text(extraLines, tableX + cols[1].x + 3, textY + nameHeight);
      }
    } else {
      doc.text(descLines, tableX + cols[1].x + 3, textY);
    }

    // Precio Unit.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(
      fmtCurrency(item.unit_price, quotation.currency),
      tableX + cols[2].x + cols[2].w - 2,
      textY,
      { align: 'right' },
    );

    // Cantidad
    const qtyStr = item.quantity_unit
      ? `${item.quantity} ${item.quantity_unit}`
      : String(item.quantity);
    doc.text(qtyStr, tableX + cols[3].x + cols[3].w / 2, textY, { align: 'center' });

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(
      fmtCurrency(item.total, quotation.currency),
      tableX + cols[4].x + cols[4].w - 2,
      textY,
      { align: 'right' },
    );

    y += rowH;
  });

  // =========================================================================
  // 6. TOTALS BLOCK
  // =========================================================================
  y += 4;
  y = ensureSpace(doc, y, 30, brand);

  const totalsX = tableX + tableW - 70;
  const totalsW = 70;

  // Thin separator
  doc.setDrawColor(...brand.primaryRGB);
  doc.setLineWidth(0.4);
  doc.line(totalsX, y, totalsX + totalsW, y);
  y += 5;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal', totalsX + 2, y);
  doc.text(fmtCurrency(quotation.subtotal, quotation.currency), totalsX + totalsW - 2, y, { align: 'right' });
  y += 6;

  // IVA
  if (quotation.includes_iva) {
    doc.text('IVA (16%)', totalsX + 2, y);
    doc.text(fmtCurrency(quotation.iva_amount, quotation.currency), totalsX + totalsW - 2, y, { align: 'right' });
    y += 6;
  }

  // Total — highlighted
  doc.setFillColor(...brand.primaryRGB);
  roundedRect(doc, totalsX, y - 4, totalsW, 10, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX + 4, y + 2.5);
  doc.text(fmtCurrency(quotation.total, quotation.currency), totalsX + totalsW - 4, y + 2.5, { align: 'right' });

  y += 16;

  // =========================================================================
  // 7. CONDITIONS
  // =========================================================================
  let conditions = [];
  if (quotation.conditions) {
    try {
      conditions = typeof quotation.conditions === 'string'
        ? JSON.parse(quotation.conditions)
        : quotation.conditions;
    } catch {
      conditions = [];
    }
  }

  if (conditions.length > 0) {
    y = ensureSpace(doc, y, 14, brand);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brand.primaryRGB);
    doc.text('Condiciones', PAGE.marginLeft, y);

    // Small accent underline
    doc.setDrawColor(...brand.accentRGB);
    doc.setLineWidth(0.8);
    doc.line(PAGE.marginLeft, y + 1.5, PAGE.marginLeft + 30, y + 1.5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);

    conditions.forEach((cond) => {
      const condLines = doc.splitTextToSize(cond, PAGE.contentWidth - 12);
      const needed = condLines.length * 4 + 2;
      y = ensureSpace(doc, y, needed, brand);

      // Bullet dot
      doc.setFillColor(...brand.primaryRGB);
      doc.circle(PAGE.marginLeft + 2.5, y - 1.2, 1, 'F');

      doc.text(condLines, PAGE.marginLeft + 7, y);
      y += condLines.length * 4 + 2;
    });

    y += 4;
  }

  // =========================================================================
  // 8. NOTES
  // =========================================================================
  if (quotation.notes) {
    y = ensureSpace(doc, y, 16, brand);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...brand.primaryRGB);
    doc.text('Notas', PAGE.marginLeft, y);

    doc.setDrawColor(...brand.accentRGB);
    doc.setLineWidth(0.8);
    doc.line(PAGE.marginLeft, y + 1.5, PAGE.marginLeft + 16, y + 1.5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(quotation.notes, PAGE.contentWidth - 4);

    noteLines.forEach((line, i) => {
      y = ensureSpace(doc, y, 5, brand);
      doc.text(line, PAGE.marginLeft + 2, y);
      y += 4;
    });

    y += 4;
  }

  // =========================================================================
  // 9. FOOTER ON EVERY PAGE + PAGE NUMBERS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, brand, p, totalPages);
  }

  // =========================================================================
  // Done — return the doc so caller can .save() or .output()
  // =========================================================================
  return doc;
}
