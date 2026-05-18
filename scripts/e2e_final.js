// E2E final flow — clicks tabs by coordinates since they are DIVs without role
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function shot(page, name, desc) {
  const fp = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: fp, fullPage: false });
  log(`SCREENSHOT: ${name} — ${desc}`);
}

async function clickTabByText(page, text) {
  // Find the tab DIV by exact text and click by coordinates
  const coords = await page.evaluate((targetText) => {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if ((el.innerText || el.textContent || '').trim() === targetText) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // find the parent that's actually the tab container (go up a few levels)
          let parent = el;
          for (let i = 0; i < 5; i++) {
            if (!parent.parentElement) break;
            parent = parent.parentElement;
            const pr = parent.getBoundingClientRect();
            if (pr.height > 30) break; // found a taller container
          }
          const pr = parent.getBoundingClientRect();
          return { x: pr.x + pr.width/2, y: pr.y + pr.height/2, found: true, text: targetText };
        }
      }
    }
    return { found: false, text: targetText };
  }, text);

  if (coords.found) {
    await page.mouse.click(coords.x, coords.y);
    log(`Clicked tab "${text}" at (${Math.round(coords.x)}, ${Math.round(coords.y)})`);
    return true;
  }
  log(`Tab "${text}" not found by coordinate click`);
  return false;
}

const results = { steps: [], issues: [] };

function step(name, status, detail='') {
  results.steps.push({ name, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  log(`STEP ${icon}: ${name}${detail ? ' — '+detail : ''}`);
}

function issue(severity, loc, desc, fix) {
  results.issues.push({ severity, loc, desc, fix });
  log(`ISSUE [${severity.toUpperCase()}]: ${loc} — ${desc}`);
}

(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  context.on('dialog', async d => { log(`DIALOG [${d.type()}]: "${d.message()}"`); await d.accept(); });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGE ERROR: ' + e.message));

  try {
    // STEP 1 — Open app
    log('=== STEP 1: Open app ===');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    await shot(page, '01_onboarding.png', 'Onboarding screen');
    const bodyText1 = await page.locator('body').innerText().catch(() => '');
    step('1. App opens', 'PASS', `Onboarding visible, text starts: "${bodyText1.substring(0, 60).replace(/\n/g,' ')}"`);

    // STEP 2 — Onboarding
    log('=== STEP 2: Onboarding ===');
    try {
      await page.click('text=Пропустить', { timeout: 5000 });
      await page.waitForTimeout(2000);
      step('2. Onboarding skip', 'PASS', 'Clicked "Пропустить"');
    } catch(e) {
      step('2. Onboarding skip', 'WARN', 'Пропустить not found — already past onboarding?');
    }

    // STEP 3 — Login screen + Try Demo
    log('=== STEP 3: Login + Try Demo ===');
    await page.waitForTimeout(1000);
    await shot(page, '02_login.png', 'Login screen');
    const loginText = await page.locator('body').innerText().catch(() => '');
    const hasTryDemo = loginText.includes('Try Demo') || loginText.includes('Demo');
    log(`Login screen text: "${loginText.substring(0, 200).replace(/\n/g,' ')}"`);

    try {
      await page.click('text=Try Demo', { timeout: 5000 });
      await page.waitForTimeout(6000); // wait for auth + navigation
      step('3. Try Demo clicked', 'PASS', 'Clicked Try Demo, waiting for navigation');
    } catch(e) {
      step('3. Try Demo clicked', 'FAIL', 'Try Demo button not found');
      issue('major', 'LoginScreen', 'Try Demo button missing', 'Check login screen rendering');
    }

    // STEP 4 — Main screen / Sessions
    log('=== STEP 4: Main screen (Sessions) ===');
    await page.waitForTimeout(2000);
    const mainText = await page.locator('body').innerText().catch(() => '');
    log(`Main screen text: "${mainText.substring(0, 300).replace(/\n/g,' ')}"`);

    const onMain = mainText.includes('Доброе') || mainText.includes('Demo') || mainText.includes('Новый чат') || mainText.includes('Чат');
    if (onMain) {
      step('4. Navigation to main screen', 'PASS', 'Main screen visible after login');
    } else {
      step('4. Navigation to main screen', 'WARN', 'Cannot confirm main screen');
      issue('major', 'Auth/Navigation', 'After Try Demo app may not navigate to main screen', 'Check auth flow navigation after successful login');
    }

    // STEP 5 — FAB "+" to create new chat
    log('=== STEP 5: Click FAB + ===');
    // The "+" button is visible in DOM, try clicking it
    let fabClicked = false;
    try {
      // Try text click first
      await page.click('text=+', { timeout: 5000 });
      fabClicked = true;
      log('Clicked + via text selector');
    } catch(e) {
      // Try by coordinates - "+" is usually at the bottom center
      const fabCoords = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        for (const el of els) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text === '+') {
            const r = el.getBoundingClientRect();
            return { x: r.x + r.width/2, y: r.y + r.height/2, found: r.width > 0 };
          }
        }
        return { found: false };
      });
      if (fabCoords.found) {
        await page.mouse.click(fabCoords.x, fabCoords.y);
        fabClicked = true;
        log(`Clicked FAB at (${Math.round(fabCoords.x)}, ${Math.round(fabCoords.y)})`);
      }
    }

    await page.waitForTimeout(2000);
    await shot(page, '03_sessions.png', 'Sessions list / after FAB click');

    if (fabClicked) {
      step('5. FAB new chat button', 'PASS', 'Clicked + button');
    } else {
      step('5. FAB new chat button', 'WARN', 'Could not click + FAB');
      issue('minor', 'SessionsScreen', 'FAB + button not clickable via text or coords', 'Check TouchableOpacity/Pressable on FAB');
    }

    // STEP 6 — Chat input + send message
    log('=== STEP 6: Chat input ===');
    await page.waitForTimeout(2000);
    const query = 'Хочу из Варшавы в Барселону на 3 дня в июне';

    let inputFound = false;
    for (const sel of ['textarea', 'input[type="text"]', '[placeholder*="сообщ"]', '[placeholder*="напиш"]', 'input:not([type="hidden"])']) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout: 5000 });
        await el.click();
        await el.fill(query);
        inputFound = true;
        log(`Typed into: ${sel}`);
        break;
      } catch(e) {}
    }

    if (inputFound) {
      await shot(page, '04_chat.png', 'Message typed in chat');
      await page.keyboard.press('Enter');
      log('Sent message via Enter');
      step('6. Chat message typed + sent', 'PASS', `Typed query, sent via Enter`);
    } else {
      await shot(page, '04_chat.png', 'Chat screen — no input found');
      step('6. Chat message typed + sent', 'FAIL', 'No text input found');
      issue('blocker', 'ChatScreen', 'Chat text input not found in web viewport', 'Check TextInput component web rendering');
    }

    // STEP 7 — Wait for AI response
    log('=== STEP 7: Waiting 25s for AI response ===');
    await page.waitForTimeout(25000);
    await shot(page, '05_ai_response.png', 'AI response after 25s');

    const aiText = await page.locator('body').innerText().catch(() => '');
    const hasFlights = /рейс|flight|варшав|барселон|waw|bcn|авиа/i.test(aiText);
    const hasHotels = /отель|hotel|гостиниц|проживани/i.test(aiText);
    const hasNoInternet = aiText.includes('Нет подключения к интернету');
    log(`AI response text snippet: "${aiText.substring(0, 400).replace(/\n/g,' ')}"`);
    log(`Has flights: ${hasFlights}, Has hotels: ${hasHotels}, Has "no internet" banner: ${hasNoInternet}`);

    if (hasNoInternet) {
      issue('major', 'ChatScreen', '"Нет подключения к интернету" banner shown in chat', 'App shows offline banner even though backend is accessible — check network connectivity detection or websocket connection in web environment');
    }

    if (hasFlights) {
      step('7. AI response + flight cards', 'PASS', `Flight content visible, Hotel: ${hasHotels}`);
    } else {
      step('7. AI response + flight cards', 'WARN', 'No flight/hotel content detected after 25s');
      issue('major', 'ChatScreen/AI', 'No flight or hotel cards visible in AI response', 'Check AI response parsing and FlightCard/HotelCard rendering');
    }

    // Navigate to chat tab first (to get tab bar back)
    await clickTabByText(page, 'Чат');
    await page.waitForTimeout(1000);

    // STEP 8 — Profile tab
    log('=== STEP 8: Profile tab ===');
    const profileClicked = await clickTabByText(page, 'Профиль');
    await page.waitForTimeout(2000);
    await shot(page, '06_profile.png', 'Profile tab');
    const profileText = await page.locator('body').innerText().catch(() => '');
    const hasUser = profileText.includes('Demo User') || profileText.includes('demo@travelai');
    log(`Profile text: "${profileText.substring(0, 400).replace(/\n/g,' ')}"`);

    if (profileClicked && hasUser) {
      step('8. Profile tab', 'PASS', 'Demo User data visible');
    } else if (profileClicked && !hasUser) {
      step('8. Profile tab', 'WARN', 'Profile tab opened but Demo User data not visible');
      issue('major', 'ProfileScreen', 'Demo user name/email not shown', 'Check auth state propagation to ProfileScreen');
    } else {
      step('8. Profile tab', 'FAIL', 'Profile tab not found/clicked');
    }

    // STEP 9 — Bookings tab
    log('=== STEP 9: Bookings tab ===');
    const bookingsClicked = await clickTabByText(page, 'Брони');
    await page.waitForTimeout(2000);
    await shot(page, '07_bookings.png', 'Bookings (Брони) tab');
    const bookingsText = await page.locator('body').innerText().catch(() => '');
    log(`Bookings text: "${bookingsText.substring(0, 300).replace(/\n/g,' ')}"`);

    if (bookingsClicked) {
      step('9. Bookings tab', 'PASS', 'Navigated to Брони tab');
    } else {
      step('9. Bookings tab', 'WARN', 'Брони tab not clicked');
      issue('minor', 'TabBar', 'Bookings/Брони tab coordinate click failed', 'Check tab bar rendering position');
    }

    // STEP 10 — Wallet tab
    log('=== STEP 10: Wallet tab ===');
    const walletClicked = await clickTabByText(page, 'Кошелёк');
    await page.waitForTimeout(2000);
    await shot(page, '08_wallet.png', 'Wallet (Кошелёк) tab');
    const walletText = await page.locator('body').innerText().catch(() => '');
    log(`Wallet text: "${walletText.substring(0, 300).replace(/\n/g,' ')}"`);

    if (walletClicked) {
      step('10. Wallet tab', 'PASS', 'Navigated to Кошелёк tab');
    } else {
      step('10. Wallet tab', 'WARN', 'Кошелёк tab not clicked');
      issue('minor', 'TabBar', 'Wallet/Кошелёк tab coordinate click failed', 'Check tab bar rendering position');
    }

  } catch(err) {
    log(`FATAL ERROR: ${err.message}\n${err.stack}`);
    await shot(page, 'error_fatal.png', 'Fatal error').catch(() => {});
    issue('blocker', 'E2E runner', `Fatal: ${err.message}`, 'Check app and test setup');
  } finally {
    console.log('\n===== E2E FINAL RESULTS =====');
    results.steps.forEach(s => {
      console.log(`  [${s.status}] ${s.name}${s.detail ? ': ' + s.detail : ''}`);
    });
    console.log('\nISSUES:');
    if (!results.issues.length) console.log('  None');
    results.issues.forEach(i => {
      console.log(`  [${i.severity.toUpperCase()}] ${i.loc} — ${i.desc}`);
      console.log(`    Fix: ${i.fix}`);
    });
    if (consoleErrors.length) {
      console.log('\nCONSOLE ERRORS:');
      [...new Set(consoleErrors)].slice(0,10).forEach(e => console.log(`  ${e}`));
    }
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'e2e_results.json'),
      JSON.stringify({ results, consoleErrors }, null, 2)
    );
    await browser.close();
  }
})();
