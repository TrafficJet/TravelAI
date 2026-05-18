const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/after-rebrand';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2500);

  // --- Login screen ---
  console.log('Taking login screen screenshot...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });
  console.log('Saved 01-login.png');

  // Dump all text content to understand the UI
  const allText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 0 && t.length < 100) texts.push(t);
    }
    return [...new Set(texts)];
  });
  console.log('All visible text:', allText);

  // Find Try Demo - try broader approach
  const tryDemoVariants = ['Try Demo', 'Try demo', 'DEMO', 'Demo Mode', 'Войти как гость', 'Guest', 'demo'];
  let demoClicked = false;
  for (const v of tryDemoVariants) {
    try {
      const count = await page.locator(`text=${v}`).count();
      if (count > 0) {
        console.log(`Found "${v}", clicking...`);
        await page.locator(`text=${v}`).first().click();
        demoClicked = true;
        break;
      }
    } catch(e) {}
  }

  if (!demoClicked) {
    // Try clicking first touchable/pressable element that's not already a tab
    console.log('Trying to find any interactive element...');
    const els = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const result = [];
      for (const el of all) {
        const text = el.textContent?.trim();
        const tag = el.tagName;
        const role = el.getAttribute('role');
        if ((tag === 'BUTTON' || role === 'button' || role === 'link' || tag === 'A') && text) {
          result.push({ tag, role, text: text.slice(0, 60), class: el.className?.slice(0,80) });
        }
      }
      return result.slice(0, 30);
    });
    console.log('Interactive elements:', JSON.stringify(els, null, 2));
  }

  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-after-login-attempt.png') });
  console.log('Saved 02-after-login-attempt.png');

  // Now get all visible text again after potential navigation
  const allText2 = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim();
      if (t.length > 0 && t.length < 100) texts.push(t);
    }
    return [...new Set(texts)];
  });
  console.log('Text after login attempt:', allText2);

  // Tab navigation - try by position (tap on bottom nav items)
  // First, let's find the bottom nav bar
  const navInfo = await page.evaluate(() => {
    // Look for elements with tab-like content
    const allEls = document.querySelectorAll('*');
    const candidates = [];
    for (const el of allEls) {
      const text = el.textContent?.trim();
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 100 && rect.height < 80 && rect.width > 30 && text) {
        candidates.push({
          tag: el.tagName,
          text: text.slice(0, 30),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          class: el.className?.slice(0, 60),
        });
      }
    }
    return candidates.slice(0, 20);
  });
  console.log('Bottom nav candidates:', JSON.stringify(navInfo, null, 2));

  // Tab definitions with multiple strategies
  const tabDefs = [
    { name: 'Chat', texts: ['Чат', 'Chat', 'АИ', 'AI', 'Ассистент'], filename: '03-chat.png' },
    { name: 'Bookings', texts: ['Брони', 'Bookings', 'Бронирования', 'Trips'], filename: '04-bookings.png' },
    { name: 'Wallet', texts: ['Кошелёк', 'Wallet', 'Finances', 'Финансы'], filename: '05-wallet.png' },
    { name: 'Profile', texts: ['Профиль', 'Profile', 'Аккаунт', 'Account', 'Меню', 'Настройки'], filename: '06-profile.png' },
  ];

  for (const tab of tabDefs) {
    console.log(`\n--- ${tab.name} tab ---`);
    let found = false;
    for (const text of tab.texts) {
      try {
        const loc = page.locator(`text=${text}`);
        const cnt = await loc.count();
        if (cnt > 0) {
          console.log(`  Clicking "${text}" (${cnt} matches)`);
          // Click the last one (bottom nav is usually last in DOM)
          await loc.last().click({ timeout: 3000 });
          await sleep(1500);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tab.filename) });
          console.log(`  Saved ${tab.filename}`);
          found = true;
          break;
        }
      } catch(e) {
        console.log(`  Error with "${text}": ${e.message.slice(0, 80)}`);
      }
    }
    if (!found) {
      console.log(`  NOT FOUND — taking current state screenshot`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tab.filename.replace('.png', '-not-found.png')) });
    }
  }

  // Color analysis
  console.log('\n--- Color Analysis ---');
  const colorInfo = await page.evaluate(() => {
    function rgbToHex(rgb) {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return rgb;
      const r = parseInt(match[1]).toString(16).padStart(2,'0');
      const g = parseInt(match[2]).toString(16).padStart(2,'0');
      const b = parseInt(match[3]).toString(16).padStart(2,'0');
      return `#${r}${g}${b}`.toUpperCase();
    }

    const allEls = document.querySelectorAll('*');
    const colorCounts = {};
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const color = style.color;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const hex = rgbToHex(bg);
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }
    }
    return colorCounts;
  });
  console.log('Background colors used:', JSON.stringify(colorInfo, null, 2));

  await browser.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
