import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

// Starts the real production server, never mocks or intercepts a response.
const port = Number(process.env.VERIFY_PORT ?? 4399);
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['--use-env-proxy', 'server/index.ts'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
let browser;
try {
  const deadline = Date.now() + 15_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited: ${logs}`);
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for startup. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Production server did not become ready: ${logs}`);
  const html = await fetch(origin);
  assert.match(html.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await html.text(), /<title>Elsewhere/);
  assert.equal((await fetch(`${origin}/api/rates/zzz`)).status, 404);
  assert.equal((await fetch(`${origin}/api/rates/usd`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${origin}/%2e%2e%2fREADME.md`)).status, 403);
  const response = await fetch(`${origin}/api/rates/usd`, { signal: AbortSignal.timeout(25_000) });
  assert.equal(response.status, 200, 'A real rate request through the production server must succeed');
  const rates = await response.json();
  assert.equal(rates.usd.usd, 1);
  assert.ok(rates.usd.eur > 0);

  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
    args: ['--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByTestId('grand-total').filter({ hasText: /\$/ }).waitFor({ timeout: 30_000 });
  const actual = await page.getByTestId('grand-total').innerText();
  // Independently check the documented example against the actual upstream rate.
  const foreignLines = [36800, 24000, 5000, 7000, 6400, 2600];
  const estimates = foreignLines.reduce((total, localCents) => total + Math.round(localCents / rates.usd.eur), 0);
  const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((36000 + estimates + Math.round(estimates * .1)) / 100);
  assert.equal(actual, expected, 'Browser budget must use the real reference table');
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByLabel('Give your trip a name').fill('Live production verification');
  await page.getByRole('button', { name: 'Save trip', exact: true }).click();
  await page.reload();
  await page.getByRole('heading', { name: 'Live production verification' }).waitFor();
  assert.equal(await page.getByTestId('grand-total').innerText(), expected);
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'passed', checkedAt: new Date().toISOString(),
    providerDate: rates.date, browserTotal: actual, fixtureData: false,
    checks: ['production startup', 'built frontend', 'CSP header', 'endpoint whitelist',
      'method restriction', 'path traversal blocked', 'real provider response',
      'browser budget equals live conversion', 'edit and reload persistence',
      '360/390/768/1440px layouts', 'no JavaScript errors'] }, null, 2));
} finally {
  await browser?.close();
  child.kill('SIGTERM');
}
