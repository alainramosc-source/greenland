// =============================================================================
// GREENLAND — Premium Quotation PDF Generator v2
// Uses jsPDF v4.2.0 (dynamic import, built-in helvetica)
// =============================================================================

const BRAND_CONFIG = {
  spaces: {
    primary: '#2d7d46',
    accent: '#a8d060',
    title: 'GREENLAND SPACES',
    logo: '/Greenland Spaces logo.png',
    primaryRGB: [45, 125, 70],
    accentRGB: [168, 208, 96],
  },
  products: {
    primary: '#6a9a04',
    accent: '#dee24b',
    title: 'GREENLAND PRODUCTS',
    logo: '/logo-pedidos.jpeg',
    primaryRGB: [106, 154, 4],
    accentRGB: [222, 228, 75],
  },
  deco: {
    primary: '#5a8a3c',
    accent: '#8fbc5a',
    title: 'GREENLAND DECO',
    logo: '/Greenland Deco logo.png',
    primaryRGB: [90, 138, 60],
    accentRGB: [143, 188, 90],
  },
};

const PAGE = {
  width: 215.9,
  height: 279.4,
  ml: 20,   // margin left
  mr: 20,   // margin right
  mt: 10,
  mb: 24,
};
PAGE.cw = PAGE.width - PAGE.ml - PAGE.mr; // content width

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const loadImage = async (path, trim = false) => {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    // Load into image element
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    if (!trim) return { data: dataUrl, w: img.naturalWidth, h: img.naturalHeight };

    // Auto-trim whitespace using canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    // Find bounding box of non-white pixels (threshold: 250)
    let top = height, bottom = 0, left = width, right = 0;
    const threshold = 250;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a > 20 && (r < threshold || g < threshold || b < threshold)) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }

    // Add small padding (2%)
    const pad = Math.round(Math.max(bottom - top, right - left) * 0.02);
    top = Math.max(0, top - pad);
    bottom = Math.min(height - 1, bottom + pad);
    left = Math.max(0, left - pad);
    right = Math.min(width - 1, right + pad);

    const cw = right - left + 1;
    const ch = bottom - top + 1;

    // Crop
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const cctx = cropCanvas.getContext('2d');
    cctx.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);

    const croppedUrl = cropCanvas.toDataURL('image/png');
    return { data: croppedUrl, w: cw, h: ch };
  } catch { return null; }
};

const fmt = (value, currency = 'MXN') => {
  const p = currency === 'USD' ? 'US$' : '$';
  return `${p}${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const hexRGB = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
};

function drawFooter(doc, brand, pn, tp) {
  const y = PAGE.height - PAGE.mb + 5;
  // Thin line
  doc.setDrawColor(...brand.primaryRGB);
  doc.setLineWidth(0.5);
  doc.line(PAGE.ml, y, PAGE.width - PAGE.mr, y);
  // Company
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('GREENLAND PRODUCTS S.A. DE C.V.  |  Blvd. Vito Alessio Robles N\u00B0 3550 Int #9, Col. Nazario Ortiz Garza C.P. 25100, Saltillo, Coahuila', PAGE.width / 2, y + 4, { align: 'center' });
  doc.text('Tel. (844) 105 8692  |  ventas@greenland-products.com.mx  |  www.greenland-products.com.mx', PAGE.width / 2, y + 8, { align: 'center' });
  // Page
  doc.setFontSize(6.5);
  doc.setTextColor(170, 170, 170);
  doc.text(`${pn} / ${tp}`, PAGE.width - PAGE.mr, y + 12, { align: 'right' });
}

function newPage(doc, brand) {
  doc.addPage();
  doc.setDrawColor(...brand.primaryRGB);
  doc.setLineWidth(0.5);
  doc.line(PAGE.ml, 8, PAGE.width - PAGE.mr, 8);
  return 14;
}

function checkSpace(doc, y, need, brand) {
  if (y + need > PAGE.height - PAGE.mb) return newPage(doc, brand);
  return y;
}

// =============================================================================
// MAIN
// =============================================================================
export default async function generateQuotationPDF(quotationData) {
  const { quotation, items = [] } = quotationData;
  const { jsPDF } = await import('jspdf');
  const bk = (quotation.brand || 'products').toLowerCase();
  const brand = BRAND_CONFIG[bk] || BRAND_CONFIG.products;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const logoData = await loadImage(brand.logo, true);

  // Preload product images
  const prodImgs = {};
  await Promise.all(items.map(async (it) => {
    if (it.image_url) {
      const d = await loadImage(it.image_url);
      if (d) prodImgs[it.image_url] = d.data;
    }
  }));

  let y = PAGE.mt;
  const pr = brand.primaryRGB;
  const rx = PAGE.width - PAGE.mr;

  // =========================================================================
  // HEADER — Clean, elegant
  // =========================================================================
  // Logo left — proportional sizing
  if (logoData) {
    try {
      const maxH = 26;
      const ratio = logoData.w / logoData.h;
      const logoH = maxH;
      const logoW = logoH * ratio;
      doc.addImage(logoData.data, 'PNG', PAGE.ml, y, Math.min(logoW, 70), logoH);
    } catch {}
  }

  // Right side info block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...pr);
  doc.text('COTIZACI\u00D3N', rx, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const dateStr = quotation.quote_date
    ? new Date(quotation.quote_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  doc.text(quotation.folio || '', rx, y + 16, { align: 'right' });
  doc.text(dateStr, rx, y + 21, { align: 'right' });

  y += 30;

  // Separator line
  doc.setDrawColor(...pr);
  doc.setLineWidth(0.8);
  doc.line(PAGE.ml, y, rx, y);
  // Thin accent below
  doc.setDrawColor(...brand.accentRGB);
  doc.setLineWidth(0.3);
  doc.line(PAGE.ml, y + 1.2, rx, y + 1.2);

  y += 7;

  // =========================================================================
  // META INFO — single line: Vigencia | Moneda
  // =========================================================================
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  const metaParts = [];
  if (quotation.validity_days) metaParts.push(`Vigencia: ${quotation.validity_days} d\u00EDas`);
  if (quotation.currency) metaParts.push(`Moneda: ${quotation.currency}`);
  if (quotation.includes_iva) metaParts.push('Precios incluyen IVA');
  if (metaParts.length) {
    doc.text(metaParts.join('   |   '), PAGE.ml, y);
    y += 6;
  }

  // =========================================================================
  // CLIENT INFO — Elegant two-column layout
  // =========================================================================
  y = checkSpace(doc, y, 28, brand);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...pr);
  doc.text('CLIENTE', PAGE.ml, y);
  y += 5;

  // Client details in a subtle box
  doc.setFillColor(249, 250, 251);
  const clientH = 22;
  doc.roundedRect(PAGE.ml, y, PAGE.cw, clientH, 2, 2, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(PAGE.ml, y, PAGE.cw, clientH, 2, 2, 'S');

  const col1x = PAGE.ml + 5;
  const col2x = PAGE.ml + PAGE.cw / 2 + 5;
  let cy = y + 6;

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(quotation.client_name || '', col1x, cy);
  cy += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (quotation.client_company) { doc.text(quotation.client_company, col1x, cy); cy += 4; }
  if (quotation.city) { doc.text(quotation.city, col1x, cy); }

  // Right column
  let ry = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (quotation.client_phone) { doc.text(`Tel: ${quotation.client_phone}`, col2x, ry); ry += 4; }
  if (quotation.client_email) { doc.text(quotation.client_email, col2x, ry); }

  y += clientH + 6;

  // =========================================================================
  // INTRO TEXT
  // =========================================================================
  if (quotation.intro_text) {
    y = checkSpace(doc, y, 16, brand);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(quotation.intro_text, PAGE.cw);
    doc.text(lines, PAGE.ml, y);
    y += lines.length * 4.2 + 5;
  }

  // =========================================================================
  // PRODUCTS TABLE
  // =========================================================================
  const hasImg = items.some(i => i.image_url && prodImgs[i.image_url]);
  const tblX = PAGE.ml;
  const tblW = PAGE.cw;

  // Column layout
  const colDefs = hasImg
    ? [
        { lbl: 'No.',           w: 10, align: 'center' },
        { lbl: 'Img.',          w: 20, align: 'center' },
        { lbl: 'Descripci\u00F3n', w: tblW - 10 - 20 - 28 - 18 - 30, align: 'left' },
        { lbl: 'P. Unitario',   w: 28, align: 'right' },
        { lbl: 'Cant.',         w: 18, align: 'center' },
        { lbl: 'Total',         w: 30, align: 'right' },
      ]
    : [
        { lbl: 'No.',           w: 10, align: 'center' },
        { lbl: 'Descripci\u00F3n', w: tblW - 10 - 28 - 18 - 30, align: 'left' },
        { lbl: 'P. Unitario',   w: 28, align: 'right' },
        { lbl: 'Cant.',         w: 18, align: 'center' },
        { lbl: 'Total',         w: 30, align: 'right' },
      ];

  // Compute x positions
  let accX = 0;
  colDefs.forEach(c => { c.x = accX; accX += c.w; });

  const descIdx = hasImg ? 2 : 1;
  const priceIdx = hasImg ? 3 : 2;
  const qtyIdx = hasImg ? 4 : 3;
  const totIdx = hasImg ? 5 : 4;

  // Table header
  y = checkSpace(doc, y, 12, brand);
  doc.setFillColor(...pr);
  doc.rect(tblX, y, tblW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  colDefs.forEach(c => {
    const tx = c.align === 'right' ? tblX + c.x + c.w - 3 :
               c.align === 'center' ? tblX + c.x + c.w / 2 :
               tblX + c.x + 3;
    doc.text(c.lbl, tx, y + 5.5, { align: c.align });
  });
  y += 8;

  // Table rows
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  sorted.forEach((item, idx) => {
    const dw = colDefs[descIdx].w - 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Calc row height
    let txtH = 10;
    if (item.name) {
      const nl = doc.splitTextToSize(item.name, dw);
      let eh = 0;
      if (item.description || item.sku) {
        let et = item.description || '';
        if (item.sku) et += (et ? '  \u2022  ' : '') + `SKU: ${item.sku}`;
        eh = doc.splitTextToSize(et, dw).length * 3.2;
      }
      txtH = nl.length * 3.8 + eh + 8;
    }
    const imgSz = 16;
    const itemHasImg = hasImg && item.image_url && prodImgs[item.image_url];
    const rowH = Math.max(txtH, itemHasImg ? imgSz + 5 : 10);

    y = checkSpace(doc, y, rowH + 1, brand);

    // Alternating row
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(tblX, y, tblW, rowH, 'F');
    }

    // Bottom border
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(tblX, y + rowH, tblX + tblW, y + rowH);

    const tY = y + 5;

    // No.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(String(idx + 1), tblX + colDefs[0].x + colDefs[0].w / 2, tY, { align: 'center' });

    // Image
    if (itemHasImg) {
      try {
        const ix = tblX + colDefs[1].x + (colDefs[1].w - imgSz) / 2;
        const iy = y + (rowH - imgSz) / 2;
        doc.addImage(prodImgs[item.image_url], 'JPEG', ix, iy, imgSz, imgSz);
      } catch {}
    }

    // Description
    const dc = colDefs[descIdx];
    if (item.name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      const nl = doc.splitTextToSize(item.name, dw);
      doc.text(nl, tblX + dc.x + 3, tY);
      const nh = nl.length * 3.8;
      if (item.description || item.sku) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        let et = item.description || '';
        if (item.sku) et += (et ? '  \u2022  ' : '') + `SKU: ${item.sku}`;
        const el = doc.splitTextToSize(et, dw);
        doc.text(el, tblX + dc.x + 3, tY + nh + 0.5);
      }
    }

    // Price
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(fmt(item.unit_price, quotation.currency), tblX + colDefs[priceIdx].x + colDefs[priceIdx].w - 3, tY, { align: 'right' });

    // Qty
    const qs = item.quantity_unit ? `${item.quantity} ${item.quantity_unit}` : String(item.quantity);
    doc.text(qs, tblX + colDefs[qtyIdx].x + colDefs[qtyIdx].w / 2, tY, { align: 'center' });

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(fmt(item.total, quotation.currency), tblX + colDefs[totIdx].x + colDefs[totIdx].w - 3, tY, { align: 'right' });

    y += rowH;
  });

  // =========================================================================
  // TOTALS
  // =========================================================================
  y += 3;
  y = checkSpace(doc, y, 28, brand);

  const totX = tblX + tblW - 68;
  const totW = 68;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', totX + 2, y + 4);
  doc.setTextColor(60, 60, 60);
  doc.text(fmt(quotation.subtotal, quotation.currency), totX + totW - 2, y + 4, { align: 'right' });

  // IVA
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.15);
  doc.line(totX, y + 7, totX + totW, y + 7);
  doc.setTextColor(100, 100, 100);
  doc.text('IVA (16%)', totX + 2, y + 12);
  doc.setTextColor(60, 60, 60);
  const ivaText = quotation.includes_iva && Number(quotation.iva_amount) === 0
    ? 'Incluido' : fmt(quotation.iva_amount, quotation.currency);
  doc.text(ivaText, totX + totW - 2, y + 12, { align: 'right' });

  // TOTAL
  doc.line(totX, y + 15, totX + totW, y + 15);
  y += 18;
  doc.setFillColor(...pr);
  doc.roundedRect(totX, y, totW, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totX + 4, y + 7);
  doc.text(fmt(quotation.total, quotation.currency), totX + totW - 4, y + 7, { align: 'right' });
  y += 18;

  // =========================================================================
  // CONDITIONS
  // =========================================================================
  let conds = [];
  try {
    conds = typeof quotation.conditions === 'string'
      ? JSON.parse(quotation.conditions) : (quotation.conditions || []);
  } catch { conds = []; }

  if (conds.length > 0) {
    y = checkSpace(doc, y, 14, brand);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...pr);
    doc.text('CONDICIONES COMERCIALES', PAGE.ml, y);
    doc.setDrawColor(...pr);
    doc.setLineWidth(0.4);
    doc.line(PAGE.ml, y + 1.5, PAGE.ml + 52, y + 1.5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);

    conds.forEach(c => {
      const cl = doc.splitTextToSize(c, PAGE.cw - 10);
      y = checkSpace(doc, y, cl.length * 3.8 + 2, brand);
      // Bullet
      doc.setFillColor(...pr);
      doc.circle(PAGE.ml + 2, y - 0.8, 0.8, 'F');
      doc.text(cl, PAGE.ml + 6, y);
      y += cl.length * 3.8 + 1.5;
    });
    y += 3;
  }

  // =========================================================================
  // NOTES
  // =========================================================================
  if (quotation.notes) {
    y = checkSpace(doc, y, 14, brand);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...pr);
    doc.text('NOTAS', PAGE.ml, y);
    doc.setDrawColor(...pr);
    doc.setLineWidth(0.4);
    doc.line(PAGE.ml, y + 1.5, PAGE.ml + 14, y + 1.5);
    y += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    const nl = doc.splitTextToSize(quotation.notes, PAGE.cw - 4);
    nl.forEach(l => {
      y = checkSpace(doc, y, 4.5, brand);
      doc.text(l, PAGE.ml + 2, y);
      y += 3.8;
    });
    y += 3;
  }

  // =========================================================================
  // CLOSING
  // =========================================================================
  y = checkSpace(doc, y, 12, brand);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Sin m\u00E1s por el momento, quedamos a sus \u00F3rdenes para cualquier duda o aclaraci\u00F3n.', PAGE.ml, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Agradecemos su preferencia y la oportunidad de atenderle.', PAGE.ml, y);

  // =========================================================================
  // FOOTER ON ALL PAGES
  // =========================================================================
  const tp = doc.getNumberOfPages();
  for (let p = 1; p <= tp; p++) {
    doc.setPage(p);
    drawFooter(doc, brand, p, tp);
  }

  return doc;
}
