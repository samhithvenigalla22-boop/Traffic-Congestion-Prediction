import http from 'http';

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const tabs = await getTabs();
  const pageTab = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
  if (!pageTab) {
    console.error('No page tab found!');
    process.exit(1);
  }

  const wsUrl = pageTab.webSocketDebuggerUrl;
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));
  let id = 1;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === msgId) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const consoleErrors = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Console.messageAdded') {
      const { level, text } = msg.params.message;
      if (level === 'error') {
        consoleErrors.push(text);
        console.error('CONSOLE ERROR:', text);
      } else {
        console.log('CONSOLE:', level, text);
      }
    }
  });

  await send('Console.enable');
  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://127.0.0.1:5173' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- STEP 1: VERIFY DEFAULT INITIAL LOCATION ---');
  let state = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        headerBadge: document.querySelector('.brand-badge-corridor')?.textContent?.trim(),
        heroTitle: document.querySelector('.hero-section .network-title')?.textContent?.trim(),
        heroCoords: document.querySelector('.loc-coords-chip')?.textContent?.trim(),
        routeBreadcrumb: document.querySelector('.route-flow-breadcrumb')?.textContent?.trim(),
        formLocation: document.querySelector('.loc-current-name')?.textContent?.trim(),
        formCoords: document.querySelector('.loc-coordinates-badge')?.textContent?.trim(),
        predictedVolume: document.querySelector('.gauge-primary-value')?.textContent?.trim(),
        congestionBadge: document.querySelector('.result-congestion-badge')?.textContent?.trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('Default State:', JSON.stringify(state.result.value, null, 2));

  console.log('\n--- STEP 2: OPEN SELECT LOCATION MODAL ---');
  let modalOpen = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-select-location-main') || document.querySelector('.btn-change-location-header');
      if (btn) btn.click();
      const modal = document.querySelector('.location-modal-card');
      const cards = Array.from(document.querySelectorAll('.loc-card')).map(c => c.querySelector('.loc-card-name')?.textContent?.trim());
      return {
        isOpen: !!modal,
        availableLocations: cards
      };
    })()`,
    returnByValue: true
  });
  console.log('Modal Opened:', JSON.stringify(modalOpen.result.value, null, 2));

  console.log('\n--- STEP 3: SELECT VIJAYAWADA ---');
  let selectVja = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.loc-card'));
      const vjaCard = cards.find(c => c.textContent.includes('Vijayawada'));
      if (vjaCard) vjaCard.click();
      return { clicked: !!vjaCard };
    })()`,
    returnByValue: true
  });
  console.log('Selected Vijayawada click:', selectVja.result.value);

  await new Promise(r => setTimeout(r, 1500));

  let vjaState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        headerBadge: document.querySelector('.brand-badge-corridor')?.textContent?.trim(),
        heroTitle: document.querySelector('.hero-section .network-title')?.textContent?.trim(),
        heroCoords: document.querySelector('.loc-coords-chip')?.textContent?.trim(),
        routeBreadcrumb: document.querySelector('.route-flow-breadcrumb')?.textContent?.trim(),
        formLocation: document.querySelector('.loc-current-name')?.textContent?.trim(),
        formCoords: document.querySelector('.loc-coordinates-badge')?.textContent?.trim(),
        predictedVolume: document.querySelector('.gauge-primary-value')?.textContent?.trim(),
        congestionBadge: document.querySelector('.result-congestion-badge')?.textContent?.trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('Vijayawada State:', JSON.stringify(vjaState.result.value, null, 2));

  console.log('\n--- STEP 4: REOPEN AND SELECT HYDERABAD ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-change-location-header');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  let selectHyd = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.loc-card'));
      const hydCard = cards.find(c => c.textContent.includes('Hyderabad'));
      if (hydCard) hydCard.click();
      return { clicked: !!hydCard };
    })()`,
    returnByValue: true
  });
  console.log('Selected Hyderabad click:', selectHyd.result.value);

  await new Promise(r => setTimeout(r, 1500));

  let hydState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        headerBadge: document.querySelector('.brand-badge-corridor')?.textContent?.trim(),
        heroTitle: document.querySelector('.hero-section .network-title')?.textContent?.trim(),
        heroCoords: document.querySelector('.loc-coords-chip')?.textContent?.trim(),
        routeBreadcrumb: document.querySelector('.route-flow-breadcrumb')?.textContent?.trim(),
        formLocation: document.querySelector('.loc-current-name')?.textContent?.trim(),
        formCoords: document.querySelector('.loc-coordinates-badge')?.textContent?.trim(),
        predictedVolume: document.querySelector('.gauge-primary-value')?.textContent?.trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('Hyderabad State:', JSON.stringify(hydState.result.value, null, 2));

  console.log('\n--- STEP 5: TEST RESET TO GUNTUR ---');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-select-location-main');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const resetBtn = document.querySelector('.btn-reset-default');
      if (resetBtn) resetBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  let gunturState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        headerBadge: document.querySelector('.brand-badge-corridor')?.textContent?.trim(),
        heroTitle: document.querySelector('.hero-section .network-title')?.textContent?.trim(),
        heroCoords: document.querySelector('.loc-coords-chip')?.textContent?.trim(),
        routeBreadcrumb: document.querySelector('.route-flow-breadcrumb')?.textContent?.trim(),
        formLocation: document.querySelector('.loc-current-name')?.textContent?.trim(),
        formCoords: document.querySelector('.loc-coordinates-badge')?.textContent?.trim()
      };
    })()`,
    returnByValue: true
  });
  console.log('Guntur Restored State:', JSON.stringify(gunturState.result.value, null, 2));

  console.log('\n--- STEP 6: VERIFY CONSOLE ERRORS ---');
  console.log('Total Console Errors:', consoleErrors.length);

  ws.close();
  if (consoleErrors.length > 0) {
    process.exit(1);
  } else {
    console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
