const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.setOffline(false);
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();

  const headLog = [];
  page.on('request', req => {
    if (req.method() === 'HEAD') headLog.push({ url: req.url(), t: Date.now() });
  });
  page.on('response', async res => {
    if (res.request().method() === 'HEAD') {
      const idx = headLog.findIndex(h => h.url === res.url());
      if (idx !== -1) headLog[idx].status = res.status();
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000); // wait for chat to load and NetInfo to check

  // Inject logging to intercept NetInfo state
  const netInfoResult = await page.evaluate(async () => {
    // Check if we can manually test the NetInfo reachability
    const onLine = navigator.onLine;
    
    // Manually make a HEAD request to / to see what happens
    try {
      const resp = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      return {
        onLine,
        headStatus: resp.status,
        headOk: resp.ok,
        isReachable: resp.status === 200
      };
    } catch(e) {
      return {
        onLine,
        fetchError: e.message
      };
    }
  });
  
  console.log('NetInfo reachability check:', JSON.stringify(netInfoResult, null, 2));
  console.log('\nHEAD requests intercepted:', JSON.stringify(headLog, null, 2));

  // Check banner state
  const bannerY = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if ((el.innerText||el.textContent||'').trim() === 'Нет подключения к интернету') {
        return el.getBoundingClientRect().y;
      }
    }
    return null;
  });
  console.log('\nBanner Y position (negative = hidden above screen):', bannerY);
  
  await browser.close();
})();
