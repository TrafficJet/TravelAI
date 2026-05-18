const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.setOffline(false); // explicitly set online
  ctx.on('dialog', async d => {
    console.log(`DIALOG [${d.type()}]: "${d.message()}"`);
    await d.accept();
  });
  const page = await ctx.newPage();

  const netLog = [];
  page.on('request', req => {
    if (req.url().includes('railway') || req.url().includes('localhost')) {
      netLog.push(`REQ: ${req.method()} ${req.url().substring(0, 150)}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('railway') || res.url().includes('localhost:3')) {
      netLog.push(`RES: ${res.status()} ${res.url().substring(0, 150)}`);
    }
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  
  // Check navigator.onLine inside app
  const onlineStatus = await page.evaluate(() => ({
    onLine: navigator.onLine,
    connection: navigator.connection ? navigator.connection.type : 'not supported'
  }));
  console.log('Browser online state:', JSON.stringify(onlineStatus));
  
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  // Check isOffline state after navigation to chat
  const onlineInChat = await page.evaluate(() => navigator.onLine);
  console.log('navigator.onLine in chat:', onlineInChat);

  const input = page.locator('textarea').first();
  await input.click().catch(() => {});
  await input.fill('Хочу из Варшавы в Барселону на 3 дня в июне');
  
  // Click the send button (orange circle with arrow)
  try {
    // Look for send button by position - it's at the right of the input area  
    const sendBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, [role="button"]');
      const results = [];
      btns.forEach(b => {
        const r = b.getBoundingClientRect();
        if (r.y > 700 && r.x > 300 && r.width > 0) {
          results.push({ x: r.x + r.width/2, y: r.y + r.height/2, text: b.innerText || b.textContent || '' });
        }
      });
      return results;
    });
    console.log('Send button candidates:', JSON.stringify(sendBtn));
  } catch(e) {}

  await page.keyboard.press('Enter');
  console.log('Pressed Enter, waiting 15s...');
  await page.waitForTimeout(15000);

  console.log('\n=== NETWORK LOG ===');
  netLog.forEach(l => console.log(l));

  const finalText = await page.locator('body').innerText().catch(() => '');
  console.log('\n=== FINAL PAGE TEXT ===');
  console.log(finalText.substring(0, 800));

  await browser.close();
})();
