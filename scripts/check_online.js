const { chromium } = require('@playwright/test');

(async () => {
  // Test headless
  const browser1 = await chromium.launch({ headless: true });
  const page1 = await browser1.newPage();
  await page1.goto('about:blank');
  const headlessOnline = await page1.evaluate(() => navigator.onLine);
  console.log(`headless navigator.onLine: ${headlessOnline}`);
  await browser1.close();

  // Test with network enabled flag
  const browser2 = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx2 = await browser2.newContext();
  // Force offline detection
  await ctx2.setOffline(false); // ensure not offline
  const page2 = await ctx2.newPage();
  await page2.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page2.waitForTimeout(3000);
  const onlineAfterSetOnline = await page2.evaluate(() => navigator.onLine);
  console.log(`After setOffline(false), navigator.onLine: ${onlineAfterSetOnline}`);
  await browser2.close();
})();
