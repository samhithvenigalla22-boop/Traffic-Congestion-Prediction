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

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Console.messageAdded') {
      console.log('CONSOLE:', msg.params.message.level, msg.params.message.text);
    }
  });

  await send('Console.enable');
  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://127.0.0.1:5173' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Check Initial Theme
  let evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        corridorTitle: document.querySelector('.network-title')?.textContent,
        themeBtn: !!document.querySelector('.theme-toggle-btn')
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial Page State:', evalRes.result.value);

  // 2. Test Theme Switching
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.theme-toggle-btn');
      if (btn) btn.click();
      return !!document.querySelector('.theme-dropdown-menu');
    })()`,
    returnByValue: true
  });
  console.log('Theme menu opened:', evalRes.result.value);

  // Click Emerald theme
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const options = Array.from(document.querySelectorAll('.theme-option-row'));
      const emerald = options.find(o => o.textContent.includes('Emerald'));
      if (emerald) emerald.click();
      return document.documentElement.getAttribute('data-theme');
    })()`,
    returnByValue: true
  });
  console.log('Switched Theme to:', evalRes.result.value);

  // 3. Test Location Picker Modal
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const locBtn = document.querySelector('.brand-badge-interactive') || document.querySelector('.location-choose-btn');
      if (locBtn) locBtn.click();
      return !!document.querySelector('.location-picker-modal');
    })()`,
    returnByValue: true
  });
  console.log('Location picker modal opened:', evalRes.result.value);

  // Select Los Angeles I-405 Corridor
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.corridor-card'));
      const lax = cards.find(c => c.textContent.includes('Los Angeles') || c.textContent.includes('I-405'));
      if (lax) lax.click();
      return {
        clicked: !!lax,
        corridorName: document.querySelector('.network-title')?.textContent,
        badgeText: document.querySelector('.brand-badge-corridor')?.textContent
      };
    })()`,
    returnByValue: true
  });
  console.log('Selected Location Result:', evalRes.result.value);

  await new Promise(r => setTimeout(r, 1500));

  // 4. Verify Final State
  evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        corridor: document.querySelector('.network-title')?.textContent,
        corridorBadge: document.querySelector('.brand-badge-corridor')?.textContent,
        predictedVolume: document.querySelector('.gauge-primary-value')?.textContent,
        congestionBadge: document.querySelector('.result-congestion-badge')?.textContent,
        waypoints: Array.from(document.querySelectorAll('.sensor-node-group text:first-of-type')).map(t => t.textContent)
      };
    })()`,
    returnByValue: true
  });
  console.log('Final Verified State:', JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
