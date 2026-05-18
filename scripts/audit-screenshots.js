// Playwright screenshot script for TravelAI UI Audit
const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = 'http://localhost:8081';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryClick(page, texts, timeout = 5000) {
  for (const text of texts) {
    try {
      const el = page.getByText(text, { exact: false }).first();
      await el.waitFor({ timeout });
      await el.click();
      return text;
    } catch {
      // Try next
    }
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Check what we see
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page text snippet:', pageText.slice(0, 300));

    // Screenshot onboarding/login as-is
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/00-initial.png` });
    console.log('Screenshot: 00-initial.png');

    // Try to skip onboarding or click through it
    const skipClicked = await tryClick(page, ['Пропустить', 'Skip', 'Пропустить онбординг'], 3000);
    if (skipClicked) {
      console.log('Clicked skip:', skipClicked);
      await sleep(2000);
    } else {
      // Try clicking "Далее" 3 times
      for (let i = 0; i < 3; i++) {
        const nextClicked = await tryClick(page, ['Далее', 'Next', 'Continue', 'Продолжить'], 3000);
        if (nextClicked) {
          console.log('Clicked next:', nextClicked);
          await sleep(1500);
        }
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-after-onboarding.png` });
    console.log('Screenshot: 01-after-onboarding.png');

    // Now should be on login screen
    const pageText2 = await page.evaluate(() => document.body.innerText);
    console.log('After onboarding text:', pageText2.slice(0, 300));

    // Try Demo login
    const demoClicked = await tryClick(page, ['Try Demo', 'Демо', 'Demo'], 5000);
    if (demoClicked) {
      console.log('Clicked demo:', demoClicked);
      await sleep(3000);
    } else {
      // Try email/password login
      console.log('Demo button not found, trying manual login...');
      try {
        await page.fill('input[type="email"], input[placeholder*="mail"]', 'demo@travelai.app');
        await page.fill('input[type="password"], input[placeholder*="пароль"], input[placeholder*="Password"]', 'Demo1234!');
        await tryClick(page, ['Войти', 'Login', 'Sign In', 'Вход'], 3000);
        await sleep(3000);
      } catch (e) {
        console.log('Manual login error:', e.message);
      }
    }

    const pageText3 = await page.evaluate(() => document.body.innerText);
    console.log('After login text:', pageText3.slice(0, 300));
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-login.png` });

    // Scroll to bottom to capture login form if still on login
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-login-bottom.png` });
    await page.evaluate(() => window.scrollTo(0, 0));

    // Try going directly to tabs if logged in
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-main.png` });

    // Inspect all visible background colors on current screen
    const colorData = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        const text = el.textContent?.trim().slice(0, 20);
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && text) {
          results.push({ tag: el.tagName, text, bg, color });
        }
      });
      return results.slice(0, 30);
    });
    console.log('Color data:', JSON.stringify(colorData, null, 2));

    // Try navigating to tabs
    const tabTexts = [
      ['Брони', 'Bookings', 'Booking'],
      ['Кошелёк', 'Wallet'],
      ['Профиль', 'Profile'],
      ['Чат', 'Chat'],
    ];

    for (const [i, texts] of tabTexts.entries()) {
      const clicked = await tryClick(page, texts, 3000);
      if (clicked) {
        console.log('Navigated to tab:', clicked);
        await sleep(1500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/tab-${i + 1}-${texts[0].toLowerCase()}.png` });
        console.log(`Screenshot: tab-${i + 1}`);
      } else {
        console.log('Tab not found:', texts);
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Fatal error:', err.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/fatal-error.png` });
  } finally {
    await browser.close();
  }
})();
