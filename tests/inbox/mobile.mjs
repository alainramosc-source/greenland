import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

// Only copied UI components, synthetic hook/data and intercepted browser traffic.
// No Supabase credentials, real sessions or production conversations are loaded.
const root = process.cwd();
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'greenland-mobile-fixture-'));
fs.mkdirSync(path.join(fixture, 'src/app'), { recursive: true });
fs.mkdirSync(path.join(fixture, 'src/hooks'), { recursive: true });
fs.mkdirSync(path.join(fixture, 'src/lib'), { recursive: true });
fs.cpSync(path.join(root, 'src/app/(dashboard)/dashboard/inbox'), path.join(fixture, 'src/inbox'), { recursive: true });
for (const file of ['inbox-push-browser.js']) fs.copyFileSync(path.join(root, 'src/lib', file), path.join(fixture, 'src/lib', file));
fs.copyFileSync(path.join(root, 'tests/inbox/mobile-fixture-hook.jsx'), path.join(fixture, 'src/hooks/useInbox.js'));
fs.copyFileSync(path.join(root, 'src/app/globals.css'), path.join(fixture, 'src/app/globals.css'));
for (const file of ['package.json', 'jsconfig.json', 'postcss.config.mjs']) if (fs.existsSync(path.join(root, file))) fs.copyFileSync(path.join(root, file), path.join(fixture, file));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
fs.writeFileSync(path.join(fixture, 'src/app/layout.js'), "import './globals.css'; export default function Layout({children}) { return <html lang='es'><body>{children}</body></html>; }");
fs.writeFileSync(path.join(fixture, 'src/app/page.js'), "import Inbox from '../inbox/page'; import Shell from '../inbox/InboxShell'; export default function Page(){return <Shell userName='Prueba'><Inbox /></Shell>}");
const port = 3129;
let logs = '';
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)],
  { cwd: fixture, windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', value => { logs += value; });
server.stderr.on('data', value => { logs += value; });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
try {
  for (let n = 0; n < 90; n++) {
    if (logs.includes('Ready in')) break;
    if (server.exitCode !== null) throw new Error(logs.slice(-3000));
    if (n === 89) throw new Error('Fixture server did not start: ' + logs.slice(-2000));
    await wait(1000);
  }
  const localBrowser = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1208/chrome-win64/chrome.exe');
  browser = await chromium.launch({ headless: true, ...(fs.existsSync(localBrowser) ? { executablePath: localBrowser } : {}) });
  const screenshots = path.join(os.tmpdir(), 'greenland-mobile-checks');
  fs.mkdirSync(screenshots, { recursive: true });
  for (const width of [320, 360, 390, 1366]) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 740 : 900 } });
    page.setDefaultTimeout(45000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (url.pathname === '/api/inbox/push') return route.fulfill({ contentType: 'application/json', body: '{"configured":false}' });
      if (url.pathname.startsWith('/fake-')) return route.fulfill({ status: 404, body: '' });
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.screenshot({ path: path.join(screenshots, `list-${width}.png`) });
    const assertFits = async label => {
      const bounds = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: innerHeight, bodyHeight: document.documentElement.scrollHeight }));
      assert(bounds.document <= bounds.width + 1, `${label}: page wider than viewport ${JSON.stringify(bounds)}`);
      assert(bounds.bodyHeight <= bounds.height + 1, `${label}: page taller than viewport ${JSON.stringify(bounds)}`);
    };
    await assertFits(`${width} list`);
    for (const name of ['Ver todos los canales', 'Filtrar por WhatsApp', 'Filtrar por Messenger', 'Filtrar por Instagram']) {
      const box = await page.getByTitle(name, { exact: true }).boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= width + 1, `${width}: clipped filter ${name}`);
    }
    await page.getByText('Cliente de prueba móvil', { exact: true }).first().click();
    await assertFits(`${width} chat`);
    const composer = page.locator('textarea');
    await composer.fill('Prueba de escritura');
    const inputBox = await composer.boundingBox();
    assert(inputBox && inputBox.x >= 0 && inputBox.x + inputBox.width <= width + 1 && inputBox.y + inputBox.height <= (width < 768 ? 740 : 900), `${width}: composer clipped`);
    await page.getByText('TextoLargoSinEspacios'.repeat(20), { exact: true }).scrollIntoViewIfNeeded();
    const textBox = await page.getByText('TextoLargoSinEspacios'.repeat(20), { exact: true }).boundingBox();
    assert(textBox && textBox.x >= 0 && textBox.x + textBox.width <= width + 1, `${width}: long text clipped`);
    assert.equal(await page.getByText('/api/inbox/attachments?path=fake-private-reference', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(screenshots, `inbox-${width}.png`) });
    if (width < 768) {
      const back = page.getByRole('button', { name: 'Chats', exact: true });
      const box = await back.boundingBox();
      assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width, 'Back must remain visible');
      await page.getByRole('button', { name: 'Contacto', exact: true }).click();
      assert(await page.getByRole('dialog', { name: 'Contacto' }).isVisible());
      await page.getByRole('button', { name: 'Volver al chat', exact: true }).click();
      await back.click();
      assert(await page.getByPlaceholder('Buscar contacto, folio o mensaje...').isVisible());
      await page.getByRole('button', { name: 'Embudo', exact: true }).click();
      await assertFits(`${width} funnel chat`);
      await page.getByRole('button', { name: 'Chats', exact: true }).click();
      await assertFits(`${width} returned list`);
    } else {
      assert.equal(await page.getByRole('button', { name: 'Chats', exact: true }).isVisible(), false);
      assert(await page.getByPlaceholder('Buscar contacto, folio o mensaje...').isVisible());
      assert(await page.getByRole('button', { name: 'Confirmar Venta', exact: true }).first().isVisible());
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS ${width}px: no viewport overflow, readable long messages, controls and navigation`);
    await page.close();
  }
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser?.close();
  if (process.platform === 'win32' && server.pid) spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else server.kill();
}
