// E2E — navigate tabs: go back from chat, then check all 4 tabs
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function shot(page, name, desc) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: false });
  log(`SS: ${name} — ${desc}`);
}

async function getDomState(page) {
  return page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    const interesting = [];
    allEls.forEach(el => {
      const text = (el.innerText || el.textContent || '').trim();
      if (['Чат','Брони','Кошелёк','Профиль','+','←','Назад'].some(t => text === t)) {
        const r = el.getBoundingClientRect();
        interesting.push({ tag: el.tagName, text, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    return { bodyText: document.body.innerText.substring(0, 300), elements: interesting };
  });
}

async function clickByCoords(page, text) {
  const info = await page.evaluate((t) => {
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if ((el.innerText || el.textContent || '').trim() === t) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: r.x + r.width/2, y: r.y + r.height/2, found: true };
        }
      }
    }
    return { found: false };
  }, text);
  if (info.found) {
    await page.mouse.click(info.x, info.y);
    log(`Clicked "${text}" at (${Math.round(info.x)}, ${Math.round(info.y)})`);
    return true;
  }
  log(`"${text}" not found in DOM`);
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  ctx.on('dialog', async d => { await d.accept(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });

  // Open app, onboarding, login
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.click('text=Пропустить', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.click('text=Try Demo', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Now on sessions screen — click FAB to create new chat
  await page.click('text=+', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Type message
  const q = 'Хочу из Варшавы в Барселону на 3 дня в июне';
  const input = page.locator('textarea').first();
  await input.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await input.click().catch(() => {});
  await input.fill(q).catch(() => {});
  await page.keyboard.press('Enter');
  log('Message sent, waiting 25s...');
  await page.waitForTimeout(25000);
  await shot(page, '05_ai_response.png', 'AI response after 25s');

  const chatDom = await getDomState(page);
  log(`In chat DOM elements: ${JSON.stringify(chatDom.elements)}`);

  // Try going back to sessions list
  log('=== Going back from chat ===');
  const backClicked = await clickByCoords(page, '←');
  if (!backClicked) {
    // Try browser back
    await page.goBack().catch(() => {});
  }
  await page.waitForTimeout(2000);

  const sessionsDom = await getDomState(page);
  log(`Sessions DOM elements: ${JSON.stringify(sessionsDom.elements)}`);
  log(`Sessions body text: ${sessionsDom.bodyText.replace(/\n/g,' ')}`);

  // Now navigate tabs
  // Profile
  log('=== Profile tab ===');
  const profClicked = await clickByCoords(page, 'Профиль');
  await page.waitForTimeout(2000);
  await shot(page, '06_profile.png', 'Profile tab');
  const profText = await page.locator('body').innerText().catch(() => '');
  log(`Profile text: "${profText.substring(0, 400).replace(/\n/g,' ')}"`);

  // Bookings
  log('=== Bookings tab ===');
  const bookClicked = await clickByCoords(page, 'Брони');
  await page.waitForTimeout(2000);
  await shot(page, '07_bookings.png', 'Bookings tab');
  const bookText = await page.locator('body').innerText().catch(() => '');
  log(`Bookings text: "${bookText.substring(0, 400).replace(/\n/g,' ')}"`);

  // Wallet
  log('=== Wallet tab ===');
  const walletClicked = await clickByCoords(page, 'Кошелёк');
  await page.waitForTimeout(2000);
  await shot(page, '08_wallet.png', 'Wallet tab');
  const walletText = await page.locator('body').innerText().catch(() => '');
  log(`Wallet text: "${walletText.substring(0, 400).replace(/\n/g,' ')}"`);

  // Summary
  console.log('\n=== TAB NAVIGATION RESULTS ===');
  console.log(`Profile clicked: ${profClicked}, Demo User visible: ${profText.includes('Demo User') || profText.includes('demo@')}`);
  console.log(`Bookings clicked: ${bookClicked}, Bookings content: "${bookText.substring(0,100).replace(/\n/g,' ')}"`);
  console.log(`Wallet clicked: ${walletClicked}, Wallet content: "${walletText.substring(0,100).replace(/\n/g,' ')}"`);

  if (errors.length) {
    console.log('\nConsole errors:', [...new Set(errors)].slice(0,5).join('\n  '));
  }

  await browser.close();
})();
