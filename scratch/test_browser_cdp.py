import subprocess
import time
import urllib.request
import json
import websocket # if available, or use playwright/selenium or urllib to CDP

# Let's check if chrome can be run with --remote-debugging-port
import sys

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
port = 9223

proc = subprocess.Popen([
    chrome_path,
    f"--remote-debugging-port={port}",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "http://127.0.0.1:5173"
])

time.sleep(2)

try:
    tabs_url = f"http://127.0.0.1:{port}/json"
    req = urllib.request.urlopen(tabs_url, timeout=5)
    tabs = json.loads(req.read().decode())
    print("Chrome tabs found:", len(tabs))
    target = tabs[0]
    ws_url = target.get("webSocketDebuggerUrl")
    print("WebSocket Debugger URL:", ws_url)
    
    # We can connect using python websockets or a quick script
    import asyncio
    try:
        import websockets
        async def inspect_page():
            async with websockets.connect(ws_url) as ws:
                # Enable Runtime and Page
                await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
                await ws.send(json.dumps({"id": 2, "method": "Page.enable"}))
                
                # Wait 2 seconds for app mount
                await asyncio.sleep(2)
                
                # Evaluate title and check for errors
                eval_script = """
                (() => {
                    const text = document.body.innerText;
                    const title = document.title;
                    const hasVolume = /ESTIMATED TRAFFIC VOLUME/i.test(text);
                    const hasXGBoost = /XGBoost/i.test(text);
                    const hasR2 = /0\.95/i.test(text);
                    const hasGauge = document.querySelector('.gauge-svg') !== null;
                    const hasCharts = document.querySelectorAll('canvas').length;
                    const hasWhatIf = /WHAT-IF SCENARIO STUDIO/i.test(text);
                    return {
                        title,
                        hasVolume,
                        hasXGBoost,
                        hasR2,
                        hasGauge,
                        canvasCount: hasCharts,
                        hasWhatIf,
                        bodyLength: text.length,
                        sampleSnippet: text.slice(0, 300)
                    };
                })()
                """
                await ws.send(json.dumps({
                    "id": 3,
                    "method": "Runtime.evaluate",
                    "params": {"expression": eval_script, "returnByValue": True}
                }))
                
                msg = await ws.recv()
                while True:
                    data = json.loads(msg)
                    if data.get("id") == 3:
                        res = data.get("result", {}).get("result", {}).get("value", {})
                        print("Page Inspection Result:", json.dumps(res, indent=2))
                        break
                    msg = await ws.recv()

        asyncio.run(inspect_page())
    except ImportError:
        print("websockets library not installed, reading DOM via curl/dump")
finally:
    proc.terminate()
