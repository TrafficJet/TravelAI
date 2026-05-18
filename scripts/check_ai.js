const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();
  
  const networkLog = [];
  page.on('request', req => {
    if (req.url().includes('chat') || req.url().includes('message') || req.url().includes('api') || req.url().includes('railway')) {
      networkLog.push(`REQ: ${req.method()} ${req.url().substring(0, 120)}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('chat') || res.url().includes('message') || res.url().includes('api') || res.url().includes('railway')) {
      networkLog.push(`RES: ${res.status()} ${res.url().substring(0, 120)}`);
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);

  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const input = page.locator('textarea').first();
  await input.click().catch(() => {});
  await input.fill('Хочу из Варшавы в Барселону на 3 дня в июне').catch(() => {});
  await page.keyboard.press('Enter');
  
  console.log('Waiting 30 seconds for AI response...');
  await page.waitForTimeout(30000);

  const pageText = await page.locator('body').innerText().catch(() => '');
  console.log('=== PAGE TEXT AFTER 30s ===');
  console.log(pageText.substring(0, 1500));
  
  console.log('\n=== NETWORK LOG ===');
  networkLog.forEach(l => console.log(l));

  await browser.close();
})();
