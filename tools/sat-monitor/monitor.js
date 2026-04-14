// ============================================================
// SAT Appointment Monitor v3
// Uses exact Angular Material selectors from live site
// Routes: /menu -> /datosPersonales -> /modulosCitas
// ============================================================

require('dotenv').config();
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  rfc: process.env.SAT_RFC,
  razonSocial: process.env.SAT_RAZON_SOCIAL,
  email: process.env.SAT_EMAIL,
  checkInterval: (parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5) * 60 * 1000,
  minDaysAhead: parseInt(process.env.MIN_DAYS_AHEAD) || 3,
  maxDaysAhead: parseInt(process.env.MAX_DAYS_AHEAD) || 5,
  adminPhone: process.env.ADMIN_PHONE,
  whatsappToken: process.env.META_WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.META_PHONE_NUMBER_ID,
  geminiKey: process.env.GOOGLE_GEMINI_API_KEY,
};

function validateConfig() {
  const missing = [];
  if (!CONFIG.rfc) missing.push('SAT_RFC');
  if (!CONFIG.email) missing.push('SAT_EMAIL');
  if (!CONFIG.razonSocial) missing.push('SAT_RAZON_SOCIAL');
  if (!CONFIG.geminiKey) missing.push('GOOGLE_GEMINI_API_KEY');
  if (!CONFIG.whatsappToken) missing.push('META_WHATSAPP_ACCESS_TOKEN');
  if (!CONFIG.phoneNumberId) missing.push('META_PHONE_NUMBER_ID');
  if (missing.length > 0) {
    console.error('Faltan variables en .env:', missing.join(', '));
    process.exit(1);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const snap = async (page, name) => {
  await page.screenshot({ path: path.join(__dirname, `${name}.png`), fullPage: true });
  console.log(`    [screenshot: ${name}.png]`);
};

// === Gemini Vision - Solve CAPTCHA ===
async function solveCaptcha(imageBuffer) {
  const genAI = new GoogleGenerativeAI(CONFIG.geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/png', data: imageBuffer.toString('base64') } },
    { text: 'Read the CAPTCHA text in this image. Return ONLY the characters, no spaces, no explanation. Just the alphanumeric characters.' },
  ]);
  const text = result.response.text().trim().replace(/[^a-zA-Z0-9]/g, '');
  console.log(`    CAPTCHA leido: "${text}"`);
  return text;
}

// === WhatsApp Alert ===
async function sendWhatsApp(message) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${CONFIG.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CONFIG.whatsappToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: CONFIG.adminPhone, type: 'text', text: { body: message } }),
      }
    );
    console.log(res.ok ? '    WhatsApp enviado!' : '    WhatsApp error: ' + await res.text());
  } catch (err) {
    console.error('    WhatsApp error:', err.message);
  }
}

// === Date filter ===
function isDateInRange(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!parts) return false;
  const d = new Date(+parts[3], +parts[2] - 1, +parts[1]);
  const diff = Math.ceil((d - today) / 86400000);
  return diff >= CONFIG.minDaysAhead && diff <= CONFIG.maxDaysAhead;
}

// === Helper: Angular-friendly field fill ===
async function angularType(page, selector, value) {
  // Clear and type character by character (Angular reactive forms need this)
  await page.click(selector, { clickCount: 3 }); // select all
  await page.type(selector, value, { delay: 20 });
  // Trigger Angular change detection
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }, selector);
}

// === Main check ===
async function checkAppointments() {
  console.log(`\n[${stamp()}] Verificando disponibilidad SAT...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Angular Material needs trusted events from a real browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,900',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    // Hide webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // ========== STEP 1: Landing page + close modal ==========
    console.log('  1. Navegando a SAT...');
    await page.goto('https://citas.sat.gob.mx/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Close the "Aviso Importante" modal 
    await page.evaluate(() => {
      // Angular Material dialog or Bootstrap modal
      const btns = [...document.querySelectorAll('button')];
      const cerrar = btns.find(b => b.textContent.trim() === 'Cerrar');
      if (cerrar) cerrar.click();
      // Also try force-hiding any modal overlay
      document.querySelectorAll('.modal, .cdk-overlay-container, .modal-backdrop').forEach(el => {
        el.style.display = 'none';
      });
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });
    await sleep(2000);
    await snap(page, 'step1-landing');

    // ========== STEP 2: Navigate to "Registrar cita" ==========
    console.log('  2. Registrar cita...');
    // The "Registrar cita" button uses Angular routing. Click it.
    const regClicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('a, button, div, span')];
      const btn = els.find(e => {
        const t = e.textContent?.trim() || '';
        return t.includes('Registrar cita') && e.offsetParent !== null && e.offsetHeight > 0;
      });
      if (btn) { btn.click(); return true; }
      return false;
    });
    
    if (!regClicked) {
      console.log('    Click fallido, usando URL directa...');
    }
    
    // Wait for Angular to route
    await sleep(3000);
    
    // Verify we're on the menu page
    let onMenu = await page.evaluate(() => 
      document.body.innerText.includes('Selecciona tu cita') || 
      document.body.innerText.includes('Selecciona') ||
      document.querySelectorAll('button.image-button').length > 0
    );
    
    if (!onMenu) {
      // Navigate directly to menu
      console.log('    Navegando directo a /menu...');
      await page.goto('https://citas.sat.gob.mx/menu', { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(3000);
      onMenu = await page.evaluate(() => 
        document.body.innerText.includes('Selecciona tu cita') || 
        document.body.innerText.includes('Selecciona') ||
        document.querySelectorAll('button.image-button').length > 0
      );
    }
    
    await snap(page, 'step2-menu');
    
    if (!onMenu) {
      console.log('  >> No se pudo llegar al menu de servicios');
      return { found: false, reason: 'nav_failed_menu' };
    }

    // ========== STEP 3: Select service ==========
    console.log('  3. Seleccionando Servicios Generales...');
    // Click "Servicios Generales" - first button.image-button
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button.image-button, button')];
      const svc = btns.find(b => b.textContent.includes('Servicios Generales'));
      if (svc) svc.click();
    });
    await sleep(3000);
    await snap(page, 'step3-service-selected');

    // Now we should see sub-services. Click "Inscripcion Personas Morales"
    console.log('  4. Seleccionando Personas Morales...');
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('a, button, div, li, mat-list-item, span')];
      const pm = els.find(e => {
        const t = e.textContent || '';
        return t.includes('Morales') && t.includes('nscripci') && e.offsetHeight > 0;
      });
      if (pm) pm.click();
    });
    await sleep(3000);
    await snap(page, 'step4-pm-selected');

    // Verify we're on datosPersonales
    let onForm = await page.evaluate(() => {
      return document.body.innerText.includes('RFC') && 
             (document.body.innerText.includes('Correo') || document.body.innerText.includes('correo'));
    });
    
    if (!onForm) {
      console.log('    Navegando directo a /datosPersonales...');
      await page.goto('https://citas.sat.gob.mx/datosPersonales', { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(3000);
    }

    // ========== STEP 4: Expand "Personas Morales" panel ==========
    console.log('  5. Expandiendo panel Personas Morales...');
    // Click the mat-expansion-panel for Personas Morales (index 1)
    await page.evaluate(() => {
      // Try clicking the expansion panel header for Personas Morales
      const headers = [...document.querySelectorAll('mat-expansion-panel-header')];
      // Find the one that mentions "Morales" or is the second one
      const pmHeader = headers.find(h => h.textContent.includes('Morales'));
      if (pmHeader) { pmHeader.click(); return; }
      // Fallback: click by id
      const h1 = document.querySelector('#mat-expansion-panel-header-1');
      if (h1) h1.click();
    });
    await sleep(2000);
    await snap(page, 'step5-panel-expanded');

    // ========== STEP 5: Fill form — positional approach ==========
    // The Personas Morales form always has these fields in order:
    // 1. RFC del representante legal
    // 2. Razón Social
    // 3. Correo electrónico
    // 4. Confirmar correo electrónico
    console.log('  6. Llenando formulario...');
    
    // Get all visible text inputs inside the expanded panel
    const visibleInputs = await page.$$eval(
      'input.form-control', 
      (inputs) => inputs
        .filter(i => i.offsetParent !== null && i.type !== 'hidden')
        .map((el, i) => ({ index: i, tagId: el.id, visible: true }))
    );
    
    console.log(`    ${visibleInputs.length} inputs visibles`);

    // Build selectors using the visible inputs - click and type into each one by position
    const fieldValues = [CONFIG.rfc, CONFIG.razonSocial, CONFIG.email, CONFIG.email];
    const fieldNames = ['RFC', 'Razon Social', 'Correo', 'Confirmar Correo'];

    for (let i = 0; i < Math.min(visibleInputs.length, fieldValues.length); i++) {
      try {
        // Use evaluate to find and focus the nth visible input
        await page.evaluate((idx) => {
          const inputs = [...document.querySelectorAll('input.form-control')]
            .filter(el => el.offsetParent !== null && el.type !== 'hidden');
          if (inputs[idx]) {
            inputs[idx].focus();
            inputs[idx].value = '';
          }
        }, i);
        
        // Type using keyboard (Angular picks this up)
        await page.keyboard.type(fieldValues[i], { delay: 15 });
        
        // Trigger Angular validation
        await page.evaluate((idx) => {
          const inputs = [...document.querySelectorAll('input.form-control')]
            .filter(el => el.offsetParent !== null && el.type !== 'hidden');
          if (inputs[idx]) {
            inputs[idx].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[idx].dispatchEvent(new Event('change', { bubbles: true }));
            inputs[idx].dispatchEvent(new Event('blur', { bubbles: true }));
          }
        }, i);
        
        console.log(`    ${fieldNames[i]}: OK`);
        await sleep(300);
      } catch (e) {
        console.log(`    ${fieldNames[i]}: Error - ${e.message}`);
      }
    }

    // Close the "Atención" modal about email validation
    // Uses btn-primary1 which is the exact class of the Cerrar button
    await sleep(1500);
    await page.evaluate(() => {
      const cerrar = document.querySelector('button.btn-primary1');
      if (cerrar) cerrar.click();
    });
    await sleep(1500);
    // Force-dismiss any remaining overlay
    await page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane, .cdk-overlay-backdrop').forEach(el => {
        el.style.display = 'none';
      });
    });
    await sleep(500);
    console.log('    Modal email cerrado');

    // SIGER radio = No — must use Puppeteer native click (Angular Material needs trusted events)
    // First scroll to make SIGER visible
    await page.evaluate(() => {
      const siger = document.querySelector('mat-radio-group, [class*="siger"]');
      if (siger) siger.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollTo(0, 600);
    });
    await sleep(500);

    // Try to find and click the "No" radio using page.click with real mouse events
    try {
      // Find the bounding box of the "No" radio button
      const noRadioBox = await page.evaluate(() => {
        const allRadios = [...document.querySelectorAll('mat-radio-button')];
        const noRadio = allRadios.find(r => r.textContent.trim() === 'No' || r.textContent.includes('No'));
        if (noRadio) {
          const rect = noRadio.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: true, text: noRadio.textContent.trim() };
        }
        // Try finding through labels
        const labels = [...document.querySelectorAll('label, span')];
        const noLabel = labels.find(l => l.textContent.trim() === 'No' && l.closest('mat-radio-button'));
        if (noLabel) {
          const rect = noLabel.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, found: true, text: 'label:No' };
        }
        return { found: false, count: allRadios.length };
      });
      
      if (noRadioBox.found) {
        // Click at the exact coordinates using Puppeteer's native click
        await page.mouse.click(noRadioBox.x, noRadioBox.y);
        console.log(`    SIGER: clicked at (${Math.round(noRadioBox.x)}, ${Math.round(noRadioBox.y)}) - "${noRadioBox.text}"`);
      } else {
        console.log(`    SIGER: no radio found (${noRadioBox.count} mat-radio-button total)`);
      }
    } catch (e) {
      console.log(`    SIGER: error - ${e.message}`);
    }
    
    // Close ALL modals (the SIGER selection triggers a new "Aviso importante" modal)
    await page.evaluate(() => {
      // Click any "Cerrar" button visible
      const btns = [...document.querySelectorAll('button')];
      btns.filter(b => b.textContent.trim() === 'Cerrar').forEach(b => b.click());
    });
    await sleep(1500);
    // Force-dismiss overlays
    await page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-pane, .cdk-overlay-backdrop, .modal, .modal-backdrop').forEach(el => {
        el.remove();
      });
      document.body.style.overflow = '';
    });
    await sleep(1000);
    console.log('    Modals cerrados');
    
    await snap(page, 'step6a-after-siger');

    // Accept terms checkbox — Tab from SIGER radio + Space
    await page.keyboard.press('Tab');
    await sleep(200);
    await page.keyboard.press('Space');
    await sleep(500);
    console.log('    Checkbox: Tab+Space');
    
    // Take a screenshot to see checkbox state
    await snap(page, 'step6b-after-checkbox');
    
    await sleep(2000); // Wait for CAPTCHA to appear

    // ========== STEP 6: CAPTCHA ==========
    console.log('  7. Buscando CAPTCHA...');
    
    // Scroll gently to CAPTCHA area (not to bottom — that loses checkbox state)
    await page.evaluate(() => {
      const captchaImg = document.querySelector('img[src^="data:image"]');
      if (captchaImg) captchaImg.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await sleep(1000);

    // The CAPTCHA image is inline base64
    let captchaElement = await page.$('img[src^="data:image"]');
    
    if (!captchaElement) {
      // Broader search
      captchaElement = await page.evaluateHandle(() => {
        const imgs = [...document.querySelectorAll('img')];
        return imgs.find(img => {
          const src = (img.src || '');
          return src.startsWith('data:image') || 
                 (img.width > 80 && img.width < 400 && img.height > 25 && img.height < 100);
        }) || null;
      });
      if (captchaElement) captchaElement = captchaElement.asElement();
    }

    if (captchaElement) {
      const captchaBuffer = await captchaElement.screenshot();
      fs.writeFileSync(path.join(__dirname, 'last-captcha.png'), captchaBuffer);
      
      const captchaText = await solveCaptcha(captchaBuffer);

      // Navigate to CAPTCHA input using Tab (from checkbox focus)
      // DO NOT click the input — clicking resets the Angular form and unchecks the checkbox
      await page.keyboard.press('Tab'); // Tab from checkbox to CAPTCHA input
      await sleep(300);
      await page.keyboard.type(captchaText, { delay: 50 });
      await sleep(300);
      // Trigger Angular events
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Confirmar Captcha"]');
        if (input) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      console.log(`    CAPTCHA ingresado: "${captchaText}"`);
    } else {
      console.log('    No hay CAPTCHA visible');
    }

    await snap(page, 'step6-filled');

    // ========== STEP 7: Submit ==========
    console.log('  8. Presionando Siguiente...');
    const submitted = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const next = btns.find(b => b.textContent.includes('Siguiente') && !b.disabled);
      if (next) { next.click(); return 'clicked'; }
      const disabled = btns.find(b => b.textContent.includes('Siguiente') && b.disabled);
      if (disabled) return 'disabled';
      return 'not_found';
    });
    
    console.log(`    Siguiente: ${submitted}`);
    
    if (submitted === 'disabled') {
      console.log('  >> Boton deshabilitado - formulario incompleto');
      // Log which fields might be missing
      const formState = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input.form-control')].filter(i => i.offsetParent);
        return inputs.map(i => ({
          value: i.value ? 'filled' : 'empty',
          placeholder: i.placeholder,
          valid: !i.classList.contains('ng-invalid'),
        }));
      });
      console.log('    Estado campos:', JSON.stringify(formState));
      return { found: false, reason: 'form_incomplete' };
    }

    await sleep(6000);
    await snap(page, 'step7-result');

    // ========== STEP 8: Analyze results ==========
    console.log('  9. Analizando resultados...');
    const pageText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(__dirname, 'last-page-text.txt'), pageText, 'utf8');

    const currentUrl = page.url();
    console.log(`    URL: ${currentUrl}`);

    // Check various outcomes
    if (pageText.match(/captcha.*(incorrecto|inv[aá]lido)/i)) {
      console.log('  >> CAPTCHA incorrecto');
      return { found: false, reason: 'captcha_wrong' };
    }

    if (pageText.match(/m[oó]dulo|oficina|sede|ubicaci[oó]n/i) && pageText.match(/selecciona|elige|disponib/i)) {
      console.log('  >> Pagina de oficinas encontrada!');
      
      const data = await page.evaluate(() => {
        const result = { offices: [], dates: [], text: document.body.innerText.substring(0, 3000) };
        document.querySelectorAll('select, mat-select').forEach(sel => {
          const opts = sel.tagName === 'SELECT' 
            ? [...sel.options].map(o => o.textContent.trim())
            : [...sel.querySelectorAll('mat-option')].map(o => o.textContent.trim());
          result.offices.push(...opts.filter(o => o));
        });
        const dates = result.text.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
        if (dates) result.dates = dates;
        return result;
      });

      const validDates = data.dates.filter(d => isDateInRange(d));
      
      if (validDates.length > 0) {
        const msg = `CITA SAT DISPONIBLE!\n\nTramite: Inscripcion Personas Morales\nRFC: ${CONFIG.rfc}\n\nFechas:\n${validDates.join('\n')}\n\nOficinas: ${data.offices.slice(0, 5).join(', ')}\n\nEntra: https://citas.sat.gob.mx/\nHora: ${new Date().toLocaleString('es-MX')}`;
        console.log('\n  CITAS ENCONTRADAS!');
        validDates.forEach(d => console.log(`    ${d}`));
        await sendWhatsApp(msg);
        return { found: true };
      }

      console.log(`    Oficinas: ${data.offices.length}, Fechas en rango: 0`);
      if (data.offices.length > 0) console.log('    Oficinas:', data.offices.slice(0, 5).join(', '));
    }

    if (pageText.match(/no hay (citas|horarios)/i) || pageText.includes('no encontr')) {
      console.log('  >> No hay citas');
      return { found: false, reason: 'no_appointments' };
    }

    if (pageText.includes('Registrar cita') && pageText.includes('Consultar')) {
      console.log('  >> Sigue en pagina principal');
      return { found: false, reason: 'nav_failed' };
    }

    console.log('  >> Resultado desconocido - revisa step7-result.png y last-page-text.txt');
    return { found: false, reason: 'unknown' };

  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return { found: false, reason: 'error', error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

// === Main loop ===
async function main() {
  console.log('=== SAT Monitor v3.0 ===');
  console.log(`RFC: ${CONFIG.rfc} | Empresa: ${CONFIG.razonSocial}`);
  console.log(`Busca citas a ${CONFIG.minDaysAhead}-${CONFIG.maxDaysAhead} dias | Cada ${CONFIG.checkInterval / 60000} min`);
  console.log(`Alerta WhatsApp: ${CONFIG.adminPhone}`);
  console.log('Ctrl+C para detener\n');

  validateConfig();

  let errors = 0, checks = 0;

  while (true) {
    checks++;
    console.log(`--- Check #${checks} ---`);
    
    const result = await checkAppointments();
    
    if (result.found) {
      console.log('\nCita encontrada! Revisa WhatsApp.');
      errors = 0;
    } else if (result.reason === 'error') {
      errors++;
      if (errors >= 5) {
        await sendWhatsApp('Monitor SAT: 5 errores. Revisa consola.');
        await sleep(15 * 60 * 1000);
        errors = 0;
        continue;
      }
    } else {
      errors = 0;
    }

    const next = new Date(Date.now() + CONFIG.checkInterval);
    console.log(`  Proxima: ${next.toLocaleTimeString('es-MX')}\n`);
    await sleep(CONFIG.checkInterval);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
