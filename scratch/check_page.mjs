import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9228;

const p = spawn(chromePath, [
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
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  console.log('Targeting tab:', pageTab.title, pageTab.url);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
    } else if (d.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', JSON.stringify(d.params.exceptionDetails));
    }
  };

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise(resolve => {
      const id = msgId++;
      const handler = (evt) => {
        const d = JSON.parse(evt.data);
        if (d.id === id) {
          ws.removeEventListener('message', handler);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Navigating to http://127.0.0.1:5173...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173' });

  await new Promise(r => setTimeout(r, 4000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.querySelector('.brand-title')?.textContent;
      const volume = document.querySelector('.volume-number')?.textContent;
      const badge = document.querySelector('.congestion-badge .badge-text')?.textContent;
      const gaugePercent = document.querySelector('.gauge-readout-percent')?.textContent;
      const r2 = document.body.innerText.match(/0\\.95/)?.[0];
      const mae = document.body.innerText.match(/282\\.44/)?.[0];
      const rmse = document.body.innerText.match(/458\\.60/)?.[0];
      const stressBtns = Array.from(document.querySelectorAll('.stress-btn')).map(b => b.textContent.trim());
      const canvasCount = document.querySelectorAll('canvas').length;
      return { title, volume, badge, gaugePercent, r2, mae, rmse, stressBtns, canvasCount };
    })()`,
    returnByValue: true
  });
  console.log('Page State Evaluation:', JSON.stringify(evalRes.result?.value, null, 2));

  console.log('Testing What-If preset: Off-Peak Night (02:00)...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('.stress-btn'));
      const nightBtn = btns.find(b => b.textContent.includes('Off-Peak Night'));
      if (nightBtn) nightBtn.click();
    })()`,
  });

  await new Promise(r => setTimeout(r, 1200));

  const simResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const deltaNum = document.querySelector('.delta-number')?.textContent;
      const deltaPct = document.querySelector('.delta-pct')?.textContent;
      const simVol = document.querySelector('.matrix-simulated .matrix-num')?.textContent;
      const simLevel = document.querySelector('.matrix-simulated .matrix-level-pill')?.textContent;
      return { deltaNum, deltaPct, simVol, simLevel };
    })()`,
    returnByValue: true
  });
  console.log('Simulation Output:', JSON.stringify(simResult.result?.value, null, 2));

  console.log('Testing Primary Form Submit...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const submitBtn = document.querySelector('.submit-btn');
      if (submitBtn) submitBtn.click();
    })()`,
  });

  await new Promise(r => setTimeout(r, 1200));

  const historyResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll('.history-item')).map(r => ({
        vol: r.querySelector('.history-volume-number')?.textContent.trim(),
        badge: r.querySelector('.congestion-badge-sm')?.textContent.trim()
      }));
      return rows;
    })()`,
    returnByValue: true
  });
  console.log('History Logged Records:', JSON.stringify(historyResult.result?.value, null, 2));

  console.log('Testing Model Info Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const modalBtn = document.querySelector('.model-info-btn');
      if (modalBtn) modalBtn.click();
    })()`,
  });

  await new Promise(r => setTimeout(r, 500));

  const modalResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const modalTitle = document.querySelector('.modal-title')?.textContent;
      const modalR2 = document.body.innerText.match(/0\\.95/)?.[0];
      return { modalTitle, modalR2, isOpen: document.querySelector('.modal-card') !== null };
    })()`,
    returnByValue: true
  });
  console.log('Model Info Modal State:', JSON.stringify(modalResult.result?.value, null, 2));

  ws.close();
} finally {
  p.kill();
}
