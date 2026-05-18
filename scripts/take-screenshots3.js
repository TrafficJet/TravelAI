const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/after-rebrand';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickText(page, text, timeout = 3000) {
  try {
    const loc = page.locator(`text=${text}`);
    const cnt = await loc.count();
    if (cnt > 0) {
      await loc.last().click({ timeout });
      return true;
    }
  } catch(e) {}
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // === LOGIN SCREEN ===
  console.log('Screenshot: Login screen');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });

  // The app shows an onboarding flow first: "Пропустить" / "Далее"
  // Click "Пропустить" to skip onboarding
  console.log('Clicking Пропустить to skip onboarding...');
  const skipped = await clickText(page, 'Пропустить');
  if (!skipped) {
    // Try clicking through onboarding with "Далее" multiple times
    for (let i = 0; i < 5; i++) {
      const clicked = await clickText(page, 'Далее');
      if (!clicked) break;
      await sleep(1000);
    }
  }
  await sleep(2000);

  // Now we should be on the actual login/auth screen
  const textAfterOnboard = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 0 && t.length < 100) texts.push(t);
    }
    return [...new Set(texts)];
  });
  console.log('After onboarding text:', textAfterOnboard);

  // Screenshot of auth screen
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });
  console.log('Updated 01-login.png (actual login/auth screen)');

  // Try Demo / Continue as guest / Войти
  const demoTexts = ['Try Demo', 'Try demo', 'Войти как гость', 'Продолжить', 'Войти', 'Начать', 'Начать бесплатно', 'Войти с демо', 'Демо'];
  let loggedIn = false;
  for (const t of demoTexts) {
    const clicked = await clickText(page, t);
    if (clicked) {
      console.log(`Clicked "${t}"`);
      loggedIn = true;
      await sleep(2000);
      break;
    }
  }

  if (!loggedIn) {
    console.log('No login button found, listing all text:');
    const texts = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent.trim();
        if (t.length > 0 && t.length < 200) texts.push(t);
      }
      return [...new Set(texts)];
    });
    console.log(texts);
  }

  await sleep(2000);
  const textAfterLogin = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 0 && t.length < 100) texts.push(t);
    }
    return [...new Set(texts)];
  });
  console.log('After login text:', textAfterLogin);

  // === TAB SCREENSHOTS ===
  const tabs = [
    { name: 'Чат (Chat)', texts: ['Чат', 'Chat'], filename: '03-chat.png' },
    { name: 'Брони (Bookings)', texts: ['Брони', 'Bookings'], filename: '04-bookings.png' },
    { name: 'Кошелёк (Wallet)', texts: ['Кошелёк', 'Wallet'], filename: '05-wallet.png' },
    { name: 'Профиль (Profile)', texts: ['Профиль', 'Profile', 'Аккаунт', 'Я'], filename: '06-profile.png' },
  ];

  for (const tab of tabs) {
    console.log(`\n--- ${tab.name} ---`);
    let found = false;
    for (const text of tab.texts) {
      const loc = page.locator(`text=${text}`);
      const cnt = await loc.count();
      if (cnt > 0) {
        console.log(`  Found "${text}" (${cnt} elements). Clicking last...`);
        await loc.last().click({ timeout: 4000 });
        await sleep(1800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tab.filename) });
        console.log(`  Saved ${tab.filename}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  Not found. Checking what is available...`);
      const allText = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const texts = [];
        let node;
        while ((node = walker.nextNode())) {
          const t = node.textContent.trim();
          if (t.length > 1 && t.length < 50) texts.push(t);
        }
        return [...new Set(texts)];
      });
      console.log('  Available text:', allText.slice(0, 30));
      // Take screenshot of current state anyway
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tab.filename) });
      console.log(`  Saved ${tab.filename} (current state)`);
    }
  }

  // === COLOR ANALYSIS ===
  console.log('\n--- Color Analysis ---');
  const colorData = await page.evaluate(() => {
    function rgbToHex(rgb) {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      const r = parseInt(match[1]).toString(16).padStart(2,'0');
      const g = parseInt(match[2]).toString(16).padStart(2,'0');
      const b = parseInt(match[3]).toString(16).padStart(2,'0');
      return `#${r}${g}${b}`.toUpperCase();
    }

    const result = {
      backgrounds: {},
      colors: {},
      suspiciousBlue: [],
      whiteBackgrounds: [],
    };

    const TARGET_AMBER = '#F59E0B';
    const TARGET_BG = '#0A0A14';
    const BLUE = '#0EA5E9';

    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const clr = style.color;

      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const hex = rgbToHex(bg);
        if (hex) {
          result.backgrounds[hex] = (result.backgrounds[hex] || 0) + 1;
          // Check for blue
          if (hex.toUpperCase() === BLUE.toUpperCase()) {
            result.suspiciousBlue.push({ tag: el.tagName, text: el.textContent?.trim().slice(0,30), hex });
          }
          // Check for white
          if (hex === '#FFFFFF' || hex === '#F2F2F2' || hex === '#FAFAFA') {
            result.whiteBackgrounds.push({ tag: el.tagName, text: el.textContent?.trim().slice(0,30), hex });
          }
        }
      }
    }

    return result;
  });

  console.log('All backgrounds:', JSON.stringify(colorData.backgrounds, null, 2));
  console.log('Blue (#0EA5E9) elements:', colorData.suspiciousBlue);
  console.log('White background elements:', colorData.whiteBackgrounds);

  await browser.close();
  console.log('\nAll done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
