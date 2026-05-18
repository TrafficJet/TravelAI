import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/scripts/screenshots';

// Create screenshots dir
import { mkdirSync } from 'fs';
try { mkdirSync(screenshotsDir, { recursive: true }); } catch(e) {}

const log = (msg) => console.log(`[DIAG] ${msg}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];

  // Capture console
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), time: Date.now() });
  });
  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message, time: Date.now() });
  });

  // Capture network
  page.on('request', req => {
    networkRequests.push({
      event: 'request',
      method: req.method(),
      url: req.url(),
      time: Date.now()
    });
  });
  page.on('response', resp => {
    networkRequests.push({
      event: 'response',
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      time: Date.now()
    });
  });
  page.on('requestfailed', req => {
    networkRequests.push({
      event: 'requestfailed',
      method: req.method(),
      url: req.url(),
      failure: req.failure()?.errorText,
      time: Date.now()
    });
  });

  // STEP 1: Navigate
  log('Step 1: Navigating to http://localhost:8081');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: join(screenshotsDir, '01_initial.png'), fullPage: true });
  log('Screenshot 01_initial.png saved');

  // STEP 2: Login
  log('Step 2: Looking for login elements');
  await page.waitForTimeout(2000);

  // Check current page content
  const pageContent = await page.evaluate(() => document.body.innerText.slice(0, 500));
  log(`Page content: ${pageContent}`);

  // Try "Try Demo" button first
  const tryDemoBtn = await page.$('text=Try Demo');
  if (tryDemoBtn) {
    log('Found "Try Demo" button, clicking...');
    await tryDemoBtn.click();
    await page.waitForTimeout(3000);
  } else {
    log('No "Try Demo" button, trying manual login...');
    // Look for email/password fields
    const emailInput = await page.$('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill('demo@travelai.app');
      await passwordInput.fill('Demo1234!');
      const loginBtn = await page.$('button[type="submit"], text=Sign In, text=Login, text=Войти');
      if (loginBtn) {
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    } else {
      log('No login form found, checking if already logged in...');
    }
  }

  await page.screenshot({ path: join(screenshotsDir, '02_after_login.png'), fullPage: true });
  log('Screenshot 02_after_login.png saved');

  // STEP 3: Console before message
  log('Step 3: Console messages before sending message:');
  const consoleBefore = [...consoleLogs];
  consoleBefore.forEach(m => log(`  [${m.type}] ${m.text}`));

  // STEP 4: Open a chat
  log('Step 4: Looking for existing chat');
  await page.waitForTimeout(2000);

  // Try to find "хочу полететь" or any chat item
  let chatFound = false;
  const chatSelectors = [
    'text=хочу полететь',
    'text=Варшав',
    'text=варшав',
    'text=Барселон',
    'text=барселон',
    '[data-testid*="chat"]',
    '[class*="chat-item"]',
    '[class*="ChatItem"]',
    '[class*="session"]'
  ];

  for (const sel of chatSelectors) {
    const el = await page.$(sel);
    if (el) {
      log(`Found chat with selector: ${sel}`);
      await el.click();
      chatFound = true;
      await page.waitForTimeout(2000);
      break;
    }
  }

  if (!chatFound) {
    log('No existing chat found, will try to create new or use current view');
  }

  await page.screenshot({ path: join(screenshotsDir, '03_chat_opened.png'), fullPage: true });
  log('Screenshot 03_chat_opened.png saved');

  // STEP 5: Send message
  log('Step 5: Sending message');
  const messageText = 'Найди рейс из Москвы в Лондон на 20 июня';

  const inputSelectors = [
    'input[placeholder*="сообщ" i]',
    'input[placeholder*="message" i]',
    'input[placeholder*="Напиш" i]',
    'input[placeholder*="Введи" i]',
    'textarea[placeholder*="сообщ" i]',
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="Напиш" i]',
    'textarea[placeholder*="Введи" i]',
    'input[type="text"]',
    'textarea',
    '[contenteditable="true"]'
  ];

  let inputEl = null;
  for (const sel of inputSelectors) {
    inputEl = await page.$(sel);
    if (inputEl) {
      log(`Found input with selector: ${sel}`);
      break;
    }
  }

  const networkBeforeSend = networkRequests.length;

  if (inputEl) {
    await inputEl.click();
    await inputEl.fill(messageText);
    await page.screenshot({ path: join(screenshotsDir, '04_message_typed.png'), fullPage: true });
    log('Screenshot 04_message_typed.png saved');

    // Try pressing Enter
    await inputEl.press('Enter');
    log('Pressed Enter to send');

    // Also look for send button
    const sendBtn = await page.$('button[type="submit"], [data-testid*="send"], [aria-label*="send" i], [aria-label*="отправ" i]');
    if (sendBtn) {
      log('Also found send button, clicking...');
      await sendBtn.click();
    }
  } else {
    log('ERROR: No input field found!');
  }

  // STEP 6: Wait 15 seconds and observe
  log('Step 6: Waiting 15 seconds...');
  await page.waitForTimeout(15000);

  await page.screenshot({ path: join(screenshotsDir, '05_after_send_15s.png'), fullPage: true });
  log('Screenshot 05_after_send_15s.png saved');

  // STEP 7: Network requests
  log('Step 7: Network requests analysis');
  const newRequests = networkRequests.slice(networkBeforeSend);
  log(`New network events after send: ${newRequests.length}`);

  // Find messages endpoint
  const messagesRequests = networkRequests.filter(r =>
    r.url && (r.url.includes('messages') || r.url.includes('chat') || r.url.includes('session'))
  );

  log('Relevant network requests (chat/messages):');
  messagesRequests.forEach(r => {
    if (r.event === 'response') {
      log(`  [${r.event}] ${r.method} ${r.url} -> ${r.status}`);
    } else if (r.event === 'requestfailed') {
      log(`  [FAILED] ${r.method} ${r.url} -> ${r.failure}`);
    } else {
      log(`  [${r.event}] ${r.method} ${r.url}`);
    }
  });

  // All requests after send
  log('\nAll network events after sending message:');
  newRequests.forEach(r => {
    if (r.event === 'response') {
      log(`  [${r.event}] ${r.method} ${r.url} -> ${r.status}`);
    } else if (r.event === 'requestfailed') {
      log(`  [FAILED] ${r.method} ${r.url} -> ${r.failure}`);
    } else {
      log(`  [${r.event}] ${r.method} ${r.url}`);
    }
  });

  // Console after send
  const consoleAfter = consoleLogs.slice(consoleBefore.length);
  log('\nConsole messages AFTER sending message:');
  consoleAfter.forEach(m => log(`  [${m.type}] ${m.text}`));

  log('\nAll console messages:');
  consoleLogs.forEach(m => log(`  [${m.type}] ${m.text}`));

  // Save full data
  const report = {
    consoleLogs,
    networkRequests,
    messagesRequests,
    newRequestsAfterSend: newRequests
  };
  writeFileSync(
    join(screenshotsDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  await browser.close();
  log('Done. Check screenshots in: ' + screenshotsDir);
})();
