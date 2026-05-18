const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/after-rebrand';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Screenshot 1: Login screen
  console.log('Taking login screen screenshot...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png'), fullPage: false });
  console.log('Saved 01-login.png');

  // Try Demo button
  console.log('Looking for Try Demo button...');
  const tryDemoSelectors = [
    'text=Try Demo',
    'text=Try demo',
    'text=TRY DEMO',
    '[data-testid="try-demo"]',
    'button:has-text("Demo")',
    'text=Demo',
  ];

  let clicked = false;
  for (const sel of tryDemoSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log(`Found Try Demo with selector: ${sel}`);
        await el.click();
        clicked = true;
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (!clicked) {
    console.log('Try Demo not found, taking screenshot of current state...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-no-demo.png') });
    // Try to find all clickable elements
    const buttons = await page.$$eval('button, [role="button"], a, [pressable]', els =>
      els.map(el => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 50), id: el.id, class: el.className }))
    );
    console.log('Available buttons:', JSON.stringify(buttons, null, 2));
  }

  await sleep(2000);

  // Screenshot after login attempt
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-after-demo-click.png') });
  console.log('Saved 02-after-demo-click.png');

  // Check what tabs are available
  const tabSelectors = [
    '[role="tab"]',
    '[data-testid*="tab"]',
    'text=Чат',
    'text=Chat',
    'text=Брони',
    'text=Bookings',
    'text=Кошелёк',
    'text=Wallet',
    'text=Профиль',
    'text=Profile',
  ];

  // Take screenshots of each tab
  const tabs = [
    { name: 'chat', labels: ['Чат', 'Chat', 'Home'], filename: '03-chat.png' },
    { name: 'bookings', labels: ['Брони', 'Bookings', 'Trips'], filename: '04-bookings.png' },
    { name: 'wallet', labels: ['Кошелёк', 'Wallet', 'Finance'], filename: '05-wallet.png' },
    { name: 'profile', labels: ['Профиль', 'Profile', 'Account'], filename: '06-profile.png' },
  ];

  for (const tab of tabs) {
    console.log(`\nLooking for ${tab.name} tab...`);
    let found = false;
    for (const label of tab.labels) {
      try {
        const el = await page.$(`text=${label}`);
        if (el) {
          console.log(`  Found "${label}", clicking...`);
          await el.click();
          await sleep(1500);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, tab.filename) });
          console.log(`  Saved ${tab.filename}`);
          found = true;
          break;
        }
      } catch (e) {
        // continue
      }
    }
    if (!found) {
      console.log(`  Tab "${tab.name}" not found`);
    }
  }

  // Analyze colors in screenshots
  console.log('\nCapturing full page for color analysis...');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-final-state.png') });

  // Get background color of body/main container
  const bodyBg = await page.evaluate(() => {
    const body = document.body;
    const main = document.querySelector('main') || document.querySelector('[class*="screen"]') || body;
    return {
      bodyBg: window.getComputedStyle(body).backgroundColor,
      mainBg: window.getComputedStyle(main).backgroundColor,
      html: document.documentElement.innerHTML.slice(0, 2000),
    };
  });
  console.log('Body background:', bodyBg.bodyBg);
  console.log('Main background:', bodyBg.mainBg);

  await browser.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
