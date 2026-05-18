const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.setOffline(false);
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();

  // Capture ALL console messages
  const allConsole = [];
  page.on('console', m => allConsole.push(`[${m.type()}] ${m.text()}`));

  // Intercept network to check if HEAD / is happening
  const headRequests = [];
  page.on('request', req => {
    if (req.method() === 'HEAD') {
      headRequests.push({ url: req.url(), method: req.method() });
    }
  });
  page.on('response', res => {
    if (headRequests.some(h => h.url === res.url())) {
      const idx = headRequests.findIndex(h => h.url === res.url());
      headRequests[idx].status = res.status();
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Check exact NetInfo state from within the app
  const netInfoState = await page.evaluate(async () => {
    // Try to access NetInfo if it's exposed globally
    if (typeof window.__netInfoState !== 'undefined') {
      return window.__netInfoState;
    }
    // Check navigator online status
    return {
      navigatorOnLine: navigator.onLine,
      connection: navigator.connection ? {
        type: navigator.connection.type,
        effectiveType: navigator.connection.effectiveType
      } : null
    };
  });

  console.log('NetInfo state from app:', JSON.stringify(netInfoState, null, 2));
  console.log('\nHEAD requests:', JSON.stringify(headRequests, null, 2));

  // Get the actual isOffline state by looking at the banner
  const bannerVisible = await page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if ((el.innerText || el.textContent || '').trim() === 'Нет подключения к интернету') {
        const r = el.getBoundingClientRect();
        return { visible: r.width > 0 && r.height > 0, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
      }
    }
    return { visible: false };
  });
  console.log('\nOffline banner visible:', JSON.stringify(bannerVisible));

  // Check console logs for NetInfo related messages
  const netInfoLogs = allConsole.filter(l => l.toLowerCase().includes('net') || l.toLowerCase().includes('connect') || l.toLowerCase().includes('offline'));
  console.log('\nNetInfo-related console logs:', netInfoLogs.slice(0, 10));
  
  await browser.close();
})();
