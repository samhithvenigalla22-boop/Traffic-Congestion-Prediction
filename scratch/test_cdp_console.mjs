// Node 24 native WebSocket CDP tester with explicit navigation
import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9225;

const chromeProc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 2000));

try {
  const tabsRes = await fetch(`http://127.0.0.1:${port}/json`);
  const tabs = await tabsRes.json();
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  console.log('Connecting to Chrome CDP at:', wsUrl);

  const ws = new WebSocket(wsUrl);

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const consoleLogs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const type = data.params.type;
      const text = data.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push({ type, text });
      if (type === 'error') {
        errors.push(text);
      }
    } else if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
    }
  };

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (evt) => {
        const d = JSON.parse(evt.data);
        if (d.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Navigating to http://127.0.0.1:5173...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173' });

  // Wait 3.5s for page to load and react state to settle
  await new Promise(r => setTimeout(r, 3500));

  const pageState = await send('Runtime.evaluate', {
    expression: `(() => {
      const volumeElem = document.querySelector('.volume-number');
      const badgeElem = document.querySelector('.congestion-badge .badge-text');
      const speedElem = document.querySelector('.commute-telemetry-row');
      const gaugeElem = document.querySelector('.gauge-readout-percent');
      const pageTitle = document.querySelector('.brand-title')?.textContent;
      return {
        pageTitle,
        volumeText: volumeElem ? volumeElem.textContent : null,
        badgeText: badgeElem ? badgeElem.textContent : null,
        gaugePercent: gaugeElem ? gaugeElem.textContent : null,
        telemetryText: speedElem ? speedElem.textContent : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Page State on initial load:', pageState.result.value);

  // Trigger What-If preset: Evening Rush
  console.log('Triggering What-If Evening Rush preset...');
  const clickResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('.stress-btn'));
      const rushBtn = btns.find(b => b.textContent.includes('Evening Rush'));
      if (rushBtn) {
        rushBtn.click();
        return 'Clicked: ' + rushBtn.textContent.trim();
      }
      return 'Evening rush button not found (found ' + btns.length + ' btns: ' + btns.map(b => b.textContent.trim()).join(', ') + ')';
    })()`,
    returnByValue: true
  });
  console.log('Action:', clickResult.result.value);

  // Wait 1.5s for simulation to complete
  await new Promise(r => setTimeout(r, 1500));

  const simState = await send('Runtime.evaluate', {
    expression: `(() => {
      const deltaNumber = document.querySelector('.delta-number')?.textContent;
      const deltaPct = document.querySelector('.delta-pct')?.textContent;
      const simVol = document.querySelector('.matrix-simulated .matrix-num')?.textContent;
      const simLevel = document.querySelector('.matrix-simulated .matrix-level-pill')?.textContent;
      return { deltaNumber, deltaPct, simVol, simLevel };
    })()`,
    returnByValue: true
  });
  console.log('What-If Simulation Delta State:', simState.result.value);

  // Check history table
  const historyState = await send('Runtime.evaluate', {
    expression: `(() => {
      const rows = document.querySelectorAll('.history-item');
      return { historyRecordCount: rows.length };
    })()`,
    returnByValue: true
  });
  console.log('History Records:', historyState.result.value);

  console.log('\n--- Console Logs Summary ---');
  console.log('Total console events:', consoleLogs.length);
  console.log('Total errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  } else {
    console.log('SUCCESS: 0 console errors detected!');
  }

  ws.close();
} finally {
  chromeProc.kill();
}
