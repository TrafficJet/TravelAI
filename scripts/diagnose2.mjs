import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

const screenshotsDir = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/scripts/screenshots';
try { mkdirSync(screenshotsDir, { recursive: true }); } catch(e) {}

const log = (msg) => console.log(`[DIAG] ${msg}`);

async function screenshot(page, name) {
  const p = `${screenshotsDir}/${name}`;
  await page.screenshot({ path: p, fullPage: true });
  log(`Screenshot saved: ${name}`);
}

async function getTexts(page) {
  return page.evaluate(() => document.body.innerText.slice(0, 800));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];

  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text(), time: Date.now() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message, time: Date.now() }));
  page.on('response', resp => networkRequests.push({
    event: 'response',
    method: resp.request().method(),
    url: resp.url(),
    status: resp.status(),
    time: Date.now()
  }));
  page.on('requestfailed', req => networkRequests.push({
    event: 'requestfailed',
    method: req.method(),
    url: req.url(),
    failure: req.failure()?.errorText,
    time: Date.now()
  }));

  // ===== STEP 1: Navigate =====
  log('STEP 1: Navigate to app');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await screenshot(page, '01_initial.png');

  // ===== STEP 2: Skip onboarding if needed =====
  log('STEP 2: Handle onboarding');
  const skipBtn = await page.$('text=Пропустить');
  if (skipBtn) {
    log('Found "Пропустить", clicking...');
    await skipBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02_after_skip.png');
  } else {
    log('No onboarding skip button found');
  }

  // Print current page content
  let txt = await getTexts(page);
  log(`Page after skip: ${txt.slice(0, 200)}`);
  await screenshot(page, '02b_current_state.png');

  // ===== STEP 3: Login =====
  log('STEP 3: Login');
  // Look for "Try Demo" button
  let tryDemo = await page.$('text=Try Demo');
  if (!tryDemo) tryDemo = await page.$('text=Демо');
  if (!tryDemo) tryDemo = await page.$('text=Demo');

  if (tryDemo) {
    log('Found Try Demo button, clicking...');
    await tryDemo.click();
    await page.waitForTimeout(3000);
    await screenshot(page, '03_after_demo.png');
  } else {
    log('No Try Demo, looking for login form...');
    txt = await getTexts(page);
    log(`Current page text: ${txt.slice(0, 300)}`);

    // Navigate directly to login
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      log('Found login form, filling credentials...');
      await emailInput.fill('demo@travelai.app');
      await passwordInput.fill('Demo1234!');
      await screenshot(page, '03_filled_form.png');

      // Submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passwordInput.press('Enter');
      }
      await page.waitForTimeout(3000);
      await screenshot(page, '03_after_login.png');
    } else {
      log('No login form found either, checking all interactive elements...');
      const allButtons = await page.$$eval('*', els =>
        els.filter(e => e.tagName === 'BUTTON' || (e.tagName === 'DIV' && e.getAttribute('role') === 'button'))
           .map(e => ({ tag: e.tagName, text: e.innerText?.slice(0, 50), role: e.getAttribute('role') }))
           .slice(0, 20)
      );
      log('Interactive elements: ' + JSON.stringify(allButtons));

      // Try clicking something that looks like a sign-in button
      for (const text of ['Войти', 'Sign In', 'Login', 'Вход', 'Зарегистрироваться', 'Начать']) {
        const btn = await page.$(`text=${text}`);
        if (btn) {
          log(`Found "${text}" button, clicking...`);
          await btn.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
      await screenshot(page, '03_attempted_login.png');
    }
  }

  // Check state after login attempt
  txt = await getTexts(page);
  log(`State after login attempt: ${txt.slice(0, 400)}`);

  // Wait for potential redirect
  await page.waitForTimeout(2000);

  // ===== STEP 4: Navigate to chat =====
  log('STEP 4: Looking for chat');
  await screenshot(page, '04_pre_chat.png');

  // Try to find a chat item
  let chatFound = false;
  // Look for various Russian/English chat text patterns
  const chatTexts = [
    'хочу полететь',
    'Варшав',
    'варшав',
    'Барселон',
    'рейс',
    'полет',
    'поездк'
  ];

  for (const chatText of chatTexts) {
    const el = await page.$(`text=${chatText}`);
    if (el) {
      log(`Found chat with text "${chatText}", clicking...`);
      await el.click();
      chatFound = true;
      await page.waitForTimeout(2000);
      break;
    }
  }

  if (!chatFound) {
    log('No specific chat found, looking for any chat-like element...');
    // Try clicking first list item
    const listItems = await page.$$('[role="listitem"], [data-testid*="chat"], [class*="session"]');
    if (listItems.length > 0) {
      log(`Found ${listItems.length} list items, clicking first...`);
      await listItems[0].click();
      chatFound = true;
      await page.waitForTimeout(2000);
    }
  }

  await screenshot(page, '05_chat_view.png');
  txt = await getTexts(page);
  log(`Chat view content: ${txt.slice(0, 400)}`);

  // ===== STEP 5: Find input and send message =====
  log('STEP 5: Send message');
  const messageText = 'Найди рейс из Москвы в Лондон на 20 июня';

  // Try various input selectors
  let inputEl = null;
  const inputSelectors = [
    'input[placeholder*="сообщ" i]',
    'input[placeholder*="Напиш" i]',
    'input[placeholder*="Введи" i]',
    'input[placeholder*="message" i]',
    'textarea[placeholder*="сообщ" i]',
    'textarea[placeholder*="Напиш" i]',
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    '[role="textbox"]'
  ];

  for (const sel of inputSelectors) {
    const el = await page.$(sel);
    if (el) {
      const isVisible = await el.isVisible();
      if (isVisible) {
        log(`Found visible input with selector: "${sel}"`);
        inputEl = el;
        break;
      }
    }
  }

  // Also try to find ALL inputs and textareas
  const allInputs = await page.$$eval('input, textarea', els =>
    els.map(e => ({
      tag: e.tagName,
      type: e.type,
      placeholder: e.placeholder,
      visible: e.offsetParent !== null,
      id: e.id,
      name: e.name
    }))
  );
  log(`All inputs/textareas on page: ${JSON.stringify(allInputs)}`);

  const networkIndexBeforeSend = networkRequests.length;
  const consoleIndexBeforeSend = consoleLogs.length;

  if (inputEl) {
    await inputEl.click();
    await inputEl.fill(messageText);
    await page.waitForTimeout(500);
    await screenshot(page, '06_message_typed.png');

    // Try pressing Enter
    await inputEl.press('Enter');
    log('Pressed Enter');
    await page.waitForTimeout(1000);

    // Also try Send button
    const sendSelectors = [
      'button[type="submit"]',
      '[data-testid*="send"]',
      '[aria-label*="send" i]',
      '[aria-label*="отправ" i]',
      'text=Отправить',
      'text=Send'
    ];
    for (const sel of sendSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        const isVisible = await btn.isVisible();
        if (isVisible) {
          log(`Found send button "${sel}", clicking...`);
          await btn.click();
          break;
        }
      }
    }
  } else {
    log('ERROR: Could not find message input field!');
    // Print all clickable elements for debugging
    const clickables = await page.$$eval('button, [role="button"], a', els =>
      els.map(e => ({ tag: e.tagName, text: e.innerText?.slice(0, 40), visible: e.offsetParent !== null }))
         .filter(e => e.visible)
         .slice(0, 30)
    );
    log(`Visible clickable elements: ${JSON.stringify(clickables)}`);
  }

  // ===== STEP 6: Wait and observe =====
  log('STEP 6: Waiting 15 seconds...');
  await page.waitForTimeout(15000);
  await screenshot(page, '07_after_15s.png');

  // ===== STEP 7: Network analysis =====
  log('STEP 7: Network analysis after send');
  const newRequests = networkRequests.slice(networkIndexBeforeSend);
  const newConsole = consoleLogs.slice(consoleIndexBeforeSend);

  log(`\n--- Network requests after send (${newRequests.length} events) ---`);
  newRequests.forEach(r => {
    if (r.event === 'response') {
      log(`  ${r.method} ${r.url} -> HTTP ${r.status}`);
    } else if (r.event === 'requestfailed') {
      log(`  FAILED: ${r.method} ${r.url} -> ${r.failure}`);
    }
  });

  log('\n--- All API requests (messages/chat/session) ---');
  const apiReqs = networkRequests.filter(r => r.url && (
    r.url.includes('messages') || r.url.includes('/chat') || r.url.includes('session') || r.url.includes('railway')
  ));
  apiReqs.forEach(r => {
    if (r.event === 'response') {
      log(`  ${r.method} ${r.url} -> HTTP ${r.status}`);
    } else if (r.event === 'requestfailed') {
      log(`  FAILED: ${r.method} ${r.url} -> ${r.failure}`);
    }
  });

  log(`\n--- Console messages after send (${newConsole.length} messages) ---`);
  newConsole.forEach(m => log(`  [${m.type}] ${m.text}`));

  log('\n--- ALL console messages (full session) ---');
  consoleLogs.forEach(m => log(`  [${m.type}] ${m.text}`));

  // Final page content
  txt = await getTexts(page);
  log(`\nFinal page content: ${txt.slice(0, 600)}`);

  writeFileSync(
    `${screenshotsDir}/full_report.json`,
    JSON.stringify({ consoleLogs, networkRequests, apiReqs }, null, 2)
  );

  await browser.close();
  log('\nDone!');
})();
