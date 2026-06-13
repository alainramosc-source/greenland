// =============================================================================
// GREENLAND — Premium Quotation PDF Generator v3
// Dynamic header with diagonal, watermark, branded footer
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
    accent: '#c5d940',
    title: 'GREENLAND PRODUCTS',
    logo: '/logo-pedidos.jpeg',
    primaryRGB: [106, 154, 4],
    accentRGB: [197, 217, 64],
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

const PAGE = { width: 215.9, height: 279.4, ml: 20, mr: 20, mt: 10, mb: 28 };
PAGE.cw = PAGE.width - PAGE.ml - PAGE.mr;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const loadImage = async (path, trim = false) => {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise(r => {
      const rd = new FileReader();
      rd.onloadend = () => r(rd.result);
      rd.readAsDataURL(blob);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    if (!trim) return { data: dataUrl, w: img.naturalWidth, h: img.naturalHeight };
    // Auto-trim whitespace
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data; const W = c.width; const H = c.height;
    let top = H, bot = 0, left = W, right = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i+3] > 20 && (d[i] < 250 || d[i+1] < 250 || d[i+2] < 250)) {
        if (y < top) top = y; if (y > bot) bot = y;
        if (x < left) left = x; if (x > right) right = x;
      }
    }
    const pad = Math.round(Math.max(bot - top, right - left) * 0.02);
    top = Math.max(0, top - pad); bot = Math.min(H - 1, bot + pad);
    left = Math.max(0, left - pad); right = Math.min(W - 1, right + pad);
    const cw = right - left + 1; const ch = bot - top + 1;
    const cc = document.createElement('canvas');
    cc.width = cw; cc.height = ch;
    cc.getContext('2d').drawImage(c, left, top, cw, ch, 0, 0, cw, ch);
    return { data: cc.toDataURL('image/png'), w: cw, h: ch };
  } catch { return null; }
};

const fmt = (v, cur = 'MXN') => {
  const p = cur === 'USD' ? 'US$' : '$';
  return `${p}${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ---------------------------------------------------------------------------
// Draw header on a page
// ---------------------------------------------------------------------------
function drawHeader(doc, brand, logoData, isFirst, quotation) {
  const pr = brand.primaryRGB;
  const ac = brand.accentRGB;
  const rx = PAGE.width - PAGE.mr;

  if (isFirst) {
    const hH = 38;

    // === DECORATIVE CORNER (top-left) ===
    doc.setFillColor(...pr);
    doc.triangle(0, 0, 32, 0, 0, 24, 'F');
    doc.setFillColor(...ac);
    doc.triangle(0, 0, 20, 0, 0, 15, 'F');

    // === DIAGONAL COLORED ZONE (right side) ===
    const diagTop = 118;
    const diagBot = 98;

    // Main fill
    doc.setFillColor(...pr);
    doc.rect(diagTop, 0, PAGE.width - diagTop, hH, 'F');
    doc.triangle(diagBot, hH, diagTop, 0, diagTop, hH, 'F');

    // Accent strip along diagonal (3mm)
    doc.setFillColor(...ac);
    doc.triangle(diagTop - 3, 0, diagTop, 0, diagBot, hH, 'F');
    doc.triangle(diagTop - 3, 0, diagBot - 3, hH, diagBot, hH, 'F');

    // === CONTACT INFO on colored zone ===
    const infoX = diagTop + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    // Row 1: Phone
    doc.text('Tel. (844) 105 8692', infoX, 8);
    // Row 2: Email
    doc.text('ventas@greenland-products.com.mx', infoX, 13);
    // Row 3: Location
    doc.text('Saltillo, Coahuila, Mexico', infoX, 18);

    // === COTIZACIÓN title on colored zone ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('COTIZACI\u00D3N', rx - 2, 28, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255, 0.9);
    doc.text(quotation.folio || '', rx - 2, 33, { align: 'right' });

    const dateStr = quotation.quote_date
      ? new Date(quotation.quote_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    doc.text(dateStr, rx - 2, 37, { align: 'right' });

    // === LOGO on white zone ===
    if (logoData) {
      try {
        const maxH = 26;
        const ratio = logoData.w / logoData.h;
        const lH = maxH;
        const lW = Math.min(lH * ratio, 75);
        doc.addImage(logoData.data, 'PNG', PAGE.ml + 8, 5, lW, lH);
      } catch {}
    }

    return hH + 5;
  } else {
    // Continuation pages — simpler header
    doc.setFillColor(...pr);
    doc.rect(0, 0, PAGE.width, 5, 'F');
    doc.setFillColor(...ac);
    doc.rect(0, 5, PAGE.width, 1.5, 'F');

    // Brand name + page indicator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...pr);
    doc.text(brand.title, PAGE.ml, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`${quotation.folio || ''} — continuaci\u00F3n`, rx, 12, { align: 'right' });

    return 18;
  }
}

// ---------------------------------------------------------------------------
// Draw footer on a page
// ---------------------------------------------------------------------------
function drawFooter(doc, brand, pn, tp) {
  const pr = brand.primaryRGB;
  const ac = brand.accentRGB;
  const fH = 18;
  const fY = PAGE.height - fH;

  // Main colored bar
  doc.setFillColor(...pr);
  doc.rect(0, fY, PAGE.width, fH, 'F');

  // Accent diagonal on right edge
  doc.setFillColor(...ac);
  doc.triangle(PAGE.width - 50, PAGE.height, PAGE.width, fY, PAGE.width, PAGE.height, 'F');

  // Small accent corner bottom-left
  doc.setFillColor(...ac);
  doc.triangle(0, PAGE.height, 0, PAGE.height - 10, 15, PAGE.height, 'F');

  // Company info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text('GREENLAND PRODUCTS S.A. DE C.V.', PAGE.width / 2, fY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'Blvd. Vito Alessio Robles N\u00B0 3550 Int #9, Col. Nazario Ortiz Garza C.P. 25100, Saltillo, Coahuila',
    PAGE.width / 2, fY + 9.5, { align: 'center' }
  );
  doc.text(
    'Tel. (844) 105 8692  |  ventas@greenland-products.com.mx  |  www.greenland-products.com.mx',
    PAGE.width / 2, fY + 13, { align: 'center' }
  );

  // Page number on accent area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`${pn} / ${tp}`, PAGE.width - 10, PAGE.height - 4, { align: 'right' });
}

// ---------------------------------------------------------------------------
// Draw watermark
// ---------------------------------------------------------------------------
function drawWatermark(doc, logoData) {
  if (!logoData) return;
  try {
    doc.setGState(new doc.GState({ opacity: 0.035 }));
    const wmH = 80;
    const ratio = logoData.w / logoData.h;
    const wmW = wmH * ratio;
    const x = (PAGE.width - wmW) / 2;
    const y = (PAGE.height - wmH) / 2 + 10;
    doc.addImage(logoData.data, 'PNG', x, y, wmW, wmH);
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch {}
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
function newPage(doc, brand, logoData, quotation) {
  doc.addPage();
  return drawHeader(doc, brand, logoData, false, quotation);
}

function checkSpace(doc, y, need, brand, logoData, quotation) {
  if (y + need > PAGE.height - PAGE.mb) return newPage(doc, brand, logoData, quotation);
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

  const pr = brand.primaryRGB;
  const rx = PAGE.width - PAGE.mr;

  // =========================================================================
  // PAGE 1 HEADER
  // =========================================================================
  let y = drawHeader(doc, brand, logoData, true, quotation);

  // =========================================================================
  // META INFO
  // =========================================================================
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  const meta = [];
  if (quotation.validity_days) meta.push(`Vigencia: ${quotation.validity_days} d\u00EDas`);
  if (quotation.currency) meta.push(`Moneda: ${quotation.currency}`);
  if (quotation.includes_iva) meta.push('Precios incluyen IVA');
  if (meta.length) {
    doc.text(meta.join('   |   '), PAGE.ml, y);
    y += 6;
  }

  // =========================================================================
  // CLIENT INFO
  // =========================================================================
  y = checkSpace(doc, y, 28, brand, logoData, quotation);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...pr);
  doc.text('CLIENTE', PAGE.ml, y);
  y += 5;

  doc.setFillColor(249, 250, 251);
  const clH = 22;
  doc.roundedRect(PAGE.ml, y, PAGE.cw, clH, 2, 2, 'F');
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.roundedRect(PAGE.ml, y, PAGE.cw, clH, 2, 2, 'S');
  // Accent bar left
  doc.setFillColor(...pr);
  doc.rect(PAGE.ml, y + 2, 2.5, clH - 4, 'F');

  const c1x = PAGE.ml + 8;
  const c2x = PAGE.ml + PAGE.cw / 2 + 5;
  let cy = y + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(quotation.client_name || '', c1x, cy);
  cy += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (quotation.client_company) { doc.text(quotation.client_company, c1x, cy); cy += 4; }
  if (quotation.city) { doc.text(quotation.city, c1x, cy); }

  let ry2 = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  if (quotation.client_phone) { doc.text(`Tel: ${quotation.client_phone}`, c2x, ry2); ry2 += 4; }
  if (quotation.client_email) { doc.text(quotation.client_email, c2x, ry2); }

  y += clH + 6;

  // =========================================================================
  // INTRO TEXT
  // =========================================================================
  if (quotation.intro_text) {
    y = checkSpace(doc, y, 16, brand, logoData, quotation);
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

  const colDefs = hasImg
    ? [
        { lbl: '#',              w: 9,  align: 'center' },
        { lbl: 'Img.',           w: 20, align: 'center' },
        { lbl: 'Descripci\u00F3n', w: tblW - 9 - 20 - 28 - 18 - 30, align: 'left' },
        { lbl: 'P. Unitario',    w: 28, align: 'right' },
        { lbl: 'Cant.',          w: 18, align: 'center' },
        { lbl: 'Total',          w: 30, align: 'right' },
      ]
    : [
        { lbl: '#',              w: 9,  align: 'center' },
        { lbl: 'Descripci\u00F3n', w: tblW - 9 - 28 - 18 - 30, align: 'left' },
        { lbl: 'P. Unitario',    w: 28, align: 'right' },
        { lbl: 'Cant.',          w: 18, align: 'center' },
        { lbl: 'Total',          w: 30, align: 'right' },
      ];

  let accX = 0;
  colDefs.forEach(c => { c.x = accX; accX += c.w; });
  const descIdx = hasImg ? 2 : 1;
  const priceIdx = hasImg ? 3 : 2;
  const qtyIdx = hasImg ? 4 : 3;
  const totIdx = hasImg ? 5 : 4;

  // Table header
  y = checkSpace(doc, y, 12, brand, logoData, quotation);
  doc.setFillColor(...pr);
  doc.rect(tblX, y, tblW, 8, 'F');
  // Small accent triangle on left edge of header row
  doc.setFillColor(...brand.accentRGB);
  doc.triangle(tblX, y, tblX + 4, y, tblX, y + 8, 'F');

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
  const lightBg = [249, 250, 251];

  sorted.forEach((item, idx) => {
    const dw = colDefs[descIdx].w - 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

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
    const imgSz = 17;
    const itemHasImg = hasImg && item.image_url && prodImgs[item.image_url];
    const rowH = Math.max(txtH, itemHasImg ? imgSz + 5 : 10);

    y = checkSpace(doc, y, rowH + 1, brand, logoData, quotation);

    if (idx % 2 === 0) {
      doc.setFillColor(...lightBg);
      doc.rect(tblX, y, tblW, rowH, 'F');
    }
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(tblX, y + rowH, tblX + tblW, y + rowH);

    const tY = y + 5;

    // #
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...pr);
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
        doc.text(doc.splitTextToSize(et, dw), tblX + dc.x + 3, tY + nh + 0.5);
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
  y = checkSpace(doc, y, 32, brand, logoData, quotation);

  const totX = tblX + tblW - 72;
  const totW = 72;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal', totX + 2, y + 4);
  doc.setTextColor(60, 60, 60);
  doc.text(fmt(quotation.subtotal, quotation.currency), totX + totW - 2, y + 4, { align: 'right' });

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.15);
  doc.line(totX, y + 7, totX + totW, y + 7);

  doc.setTextColor(100, 100, 100);
  doc.text('IVA (16%)', totX + 2, y + 12);
  doc.setTextColor(60, 60, 60);
  const ivaText = quotation.includes_iva && Number(quotation.iva_amount) === 0
    ? 'Incluido' : fmt(quotation.iva_amount, quotation.currency);
  doc.text(ivaText, totX + totW - 2, y + 12, { align: 'right' });

  doc.line(totX, y + 15, totX + totW, y + 15);
  y += 18;

  // TOTAL box
  doc.setFillColor(...pr);
  doc.roundedRect(totX, y, totW, 11, 2, 2, 'F');
  // Accent triangle inside total box
  doc.setFillColor(...brand.accentRGB);
  doc.triangle(totX, y + 11, totX, y + 4, totX + 6, y + 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totX + 5, y + 7.5);
  doc.text(fmt(quotation.total, quotation.currency), totX + totW - 5, y + 7.5, { align: 'right' });
  y += 20;

  // =========================================================================
  // CONDITIONS
  // =========================================================================
  let conds = [];
  try {
    conds = typeof quotation.conditions === 'string'
      ? JSON.parse(quotation.conditions) : (quotation.conditions || []);
  } catch { conds = []; }

  if (conds.length > 0) {
    y = checkSpace(doc, y, 14, brand, logoData, quotation);
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
      y = checkSpace(doc, y, cl.length * 3.8 + 2, brand, logoData, quotation);
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
    y = checkSpace(doc, y, 14, brand, logoData, quotation);
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
      y = checkSpace(doc, y, 4.5, brand, logoData, quotation);
      doc.text(l, PAGE.ml + 2, y);
      y += 3.8;
    });
    y += 3;
  }

  // =========================================================================
  // CLOSING + QR CODE
  // =========================================================================
  y = checkSpace(doc, y, 38, brand, logoData, quotation);
  const closingY = y;

  // Closing text (left side)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Sin m\u00E1s por el momento, quedamos a sus \u00F3rdenes para cualquier duda o aclaraci\u00F3n.', PAGE.ml, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Agradecemos su preferencia y la oportunidad de atenderle.', PAGE.ml, y);

  // QR Code (right side, aligned with closing text)
  try {
    const QRCode = (await import('qrcode')).default;
    const qrUrl = 'https://greenland-products.com.mx';
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: brand.primary, light: '#ffffff' },
    });
    const qrSize = 25;
    const qrX = rx - qrSize;
    const qrY = closingY - 4;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    // Label below QR
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(150, 150, 150);
    doc.text('greenland-products.com.mx', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
  } catch {}

  // =========================================================================
  // WATERMARK + FOOTER on all pages
  // =========================================================================
  const tp = doc.getNumberOfPages();
  for (let p = 1; p <= tp; p++) {
    doc.setPage(p);
    drawWatermark(doc, logoData);
    drawFooter(doc, brand, p, tp);
  }

  return doc;
}
