// Final screenshots for QA report
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SS = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.setOffline(false);
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();

  // Network log
  const apiLog = [];
  page.on('request', req => { if (req.url().includes('railway')) apiLog.push(`REQ ${req.method()} ${req.url().split('railway.app')[1]}`); });
  page.on('response', res => { if (res.url().includes('railway')) apiLog.push(`RES ${res.status()} ${res.url().split('railway.app')[1]}`); });

  // Open app
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SS, '01_onboarding.png') });
  console.log('01_onboarding.png saved');

  // Skip onboarding
  await page.click('text=Пропустить').catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SS, '02_login.png') });
  console.log('02_login.png saved');

  // Try Demo
  await page.click('text=Try Demo');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SS, '03_sessions.png') });
  console.log('03_sessions.png saved');

  // Click + (FAB)
  await page.click('text=+').catch(() => {});
  await page.waitForTimeout(2000);

  // Type message
  const input = page.locator('textarea').first();
  await input.click();
  await input.fill('Хочу из Варшавы в Барселону на 3 дня в июне');
  await page.screenshot({ path: path.join(SS, '04_chat.png') });
  console.log('04_chat.png saved');

  // Send
  await page.keyboard.press('Enter');
  console.log('Message sent, waiting 30 seconds...');
  await page.waitForTimeout(30000);
  await page.screenshot({ path: path.join(SS, '05_ai_response.png') });
  console.log('05_ai_response.png saved');
  
  const chatText = await page.locator('body').innerText();
  console.log('Chat text after 30s:', chatText.substring(0, 600));

  // Go back
  await page.click('text=←').catch(() => {
    page.evaluate(() => window.history.back());
  });
  await page.waitForTimeout(2000);

  // Profile tab
  const profileCoord = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if ((el.innerText||el.textContent||'').trim() === 'Профиль') {
        const r = el.getBoundingClientRect();
        if (r.width > 0) return { x: r.x + r.width/2, y: r.y + r.height/2 };
      }
    }
    return null;
  });
  if (profileCoord) { await page.mouse.click(profileCoord.x, profileCoord.y); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SS, '06_profile.png') });
  console.log('06_profile.png saved');

  // Bookings tab
  const bookCoord = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if ((el.innerText||el.textContent||'').trim() === 'Брони') {
        const r = el.getBoundingClientRect();
        if (r.width > 0) return { x: r.x + r.width/2, y: r.y + r.height/2 };
      }
    }
    return null;
  });
  if (bookCoord) { await page.mouse.click(bookCoord.x, bookCoord.y); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SS, '07_bookings.png') });
  console.log('07_bookings.png saved');

  // Wallet tab
  const walletCoord = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if ((el.innerText||el.textContent||'').trim() === 'Кошелёк') {
        const r = el.getBoundingClientRect();
        if (r.width > 0) return { x: r.x + r.width/2, y: r.y + r.height/2 };
      }
    }
    return null;
  });
  if (walletCoord) { await page.mouse.click(walletCoord.x, walletCoord.y); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SS, '08_wallet.png') });
  console.log('08_wallet.png saved');

  console.log('\nAPI log:');
  apiLog.forEach(l => console.log(' ', l));

  await browser.close();
})();
