import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333 + Math.floor(Math.random() * 400);
const profileDir = `C:/Users/MG/AppData/Local/Temp/chrome-nawy-${randomUUID()}`;

const [url, out, widthArg = "390", heightArg = "844", fullArg = "true"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/shoot.mjs <url> <out> [width] [height] [full]");
  process.exit(1);
}
const width = Number(widthArg);
const height = Number(heightArg);
const fullPage = fullArg !== "false";

mkdirSync(out.replace(/[\\/][^\\/]+$/, ""), { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function targetInfo() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await response.json();
      const page = list.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // chrome not ready yet
    }
    await sleep(250);
  }
  throw new Error("Chrome debugging target never appeared");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 0;
    socket.onopen = () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = ++nextId;
            pending.set(id, (message) => (message.error ? rej(new Error(JSON.stringify(message.error))) : res(message.result)));
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          socket.close();
        },
      });
    };
    socket.onerror = () => reject(new Error("CDP socket error"));
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    };
  });
}

try {
  const target = await targetInfo();
  const client = await connect(target.webSocketDebuggerUrl);

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  await client.send("Page.navigate", { url });
  await sleep(3200);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const state = await client.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (state.result.value === "complete") break;
    await sleep(200);
  }

  await client.send("Runtime.evaluate", {
    expression: "document.fonts.ready.then(() => true)",
    awaitPromise: true,
    returnByValue: true,
  });
  await sleep(800);

  let clip;
  if (fullPage) {
    const metrics = await client.send("Page.getLayoutMetrics");
    const content = metrics.cssContentSize ?? metrics.contentSize;
    clip = { x: 0, y: 0, width, height: Math.max(height, Math.ceil(content.height)), scale: 1 };
  } else {
    clip = { x: 0, y: 0, width, height, scale: 1 };
  }

  const shot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: fullPage,
    clip,
  });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`saved ${out} (${clip.width}x${clip.height})`);
  client.close();
} finally {
  chrome.kill();
  await sleep(400);
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
}
