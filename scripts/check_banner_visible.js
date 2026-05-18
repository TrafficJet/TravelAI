const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const result = await page.evaluate(async () => {
    const onLine = navigator.onLine;
    let headStatus = null;
    try {
      const r = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      headStatus = r.status;
    } catch(e) {}
    
    // Find banner
    const all = document.querySelectorAll('*');
    let bannerInfo = null;
    for (const el of all) {
      if ((el.innerText||el.textContent||'').trim() === 'Нет подключения к интернету') {
        const r = el.getBoundingClientRect();
        bannerInfo = { y: r.y, visible: r.y >= 0 };
        break;
      }
    }
    return { onLine, headStatus, bannerInfo };
  });

  console.log('Result (non-headless):', JSON.stringify(result, null, 2));
  await page.screenshot({ path: '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/debug_banner_visible.png' });
  await browser.close();
})();
