const DEVTOOLS_PORT = Number(process.env.DEVTOOLS_PORT ?? 9223);
const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:3001";
const ROUTES = (process.env.AUDIT_ROUTES ?? "/home,/contact,/vlog")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const targets = await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json/list`).then(
  (response) => response.json(),
);
const target = targets.find((entry) => entry.type === "page");

if (!target?.webSocketDebuggerUrl) {
  throw new Error("Chrome DevTools page target was not found.");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const eventWaiters = new Map();
let commandId = 0;

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);

  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }

  const waiters = eventWaiters.get(message.method);
  if (!waiters?.length) return;
  eventWaiters.delete(message.method);
  for (const resolve of waiters) resolve(message.params);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function waitForEvent(method, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    const wrappedResolve = (params) => {
      clearTimeout(timeout);
      resolve(params);
    };
    const waiters = eventWaiters.get(method) ?? [];
    waiters.push(wrappedResolve);
    eventWaiters.set(method, waiters);
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result.value;
}

await command("Page.enable");
await command("Runtime.enable");
await command("Performance.enable");
await command("Network.enable");
await command("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await command("Emulation.setCPUThrottlingRate", { rate: 4 });

const results = [];

for (const route of ROUTES) {
  const url = new URL(route, BASE_URL).toString();
  const loaded = waitForEvent("Page.loadEventFired");
  console.info("[aether:performance:navigate]", { route, url });
  await command("Page.navigate", { url });
  await loaded;

  const pageMetrics = await evaluate(`(async () => {
    await new Promise((resolve) => setTimeout(resolve, 750));

    const observeBuffered = (type, timeoutMs = 120) =>
      new Promise((resolve) => {
        const entries = [];
        let observer;
        try {
          observer = new PerformanceObserver((list) => {
            entries.push(...list.getEntries());
          });
          observer.observe({ type, buffered: true });
        } catch {
          resolve([]);
          return;
        }
        setTimeout(() => {
          observer.disconnect();
          resolve(entries);
        }, timeoutMs);
      });

    const [lcpEntries, layoutEntries, longTaskEntries] = await Promise.all([
      observeBuffered("largest-contentful-paint"),
      observeBuffered("layout-shift"),
      observeBuffered("longtask"),
    ]);

    const frameTimes = [];
    const sampleDurationMs = 2400;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);

    await new Promise((resolve) => {
      let previous;
      let started;
      const sample = (now) => {
        if (started === undefined) started = now;
        if (previous !== undefined) frameTimes.push(now - previous);
        previous = now;
        const progress = Math.min(1, (now - started) / sampleDurationMs);
        scrollTo(0, maxScroll * progress);
        if (progress >= 1) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    const sortedFrames = [...frameTimes].sort((a, b) => a - b);
    const averageFrameMs =
      frameTimes.reduce((sum, value) => sum + value, 0) /
      Math.max(1, frameTimes.length);
    const cls = layoutEntries
      .filter((entry) => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + entry.value, 0);
    const paints = performance.getEntriesByType("paint");
    const navigation = performance.getEntriesByType("navigation")[0];
    const lcp = lcpEntries.at(-1);

    return {
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      fcpMs:
        paints.find((entry) => entry.name === "first-contentful-paint")
          ?.startTime ?? null,
      lcpMs: lcp?.startTime ?? null,
      lcpElement:
        lcp?.element?.getAttribute?.("data-section-number") ??
        lcp?.element?.tagName ??
        null,
      cls,
      loadMs: navigation?.loadEventEnd ?? null,
      sampledFrames: frameTimes.length,
      averageFps: averageFrameMs ? 1000 / averageFrameMs : null,
      p95FrameMs: sortedFrames.length
        ? sortedFrames[Math.floor(sortedFrames.length * 0.95)]
        : null,
      framesOver20ms: frameTimes.filter((value) => value > 20).length,
      framesOver50ms: frameTimes.filter((value) => value > 50).length,
      longTaskCount: longTaskEntries.length,
      scrollHeight: document.documentElement.scrollHeight,
    };
  })()`);

  const rawPerformance = await command("Performance.getMetrics");
  const metricMap = Object.fromEntries(
    rawPerformance.metrics.map(({ name, value }) => [name, value]),
  );
  const result = {
    route,
    cpuThrottle: 4,
    ...pageMetrics,
    taskDurationMs: Math.round((metricMap.TaskDuration ?? 0) * 1000),
    jsHeapUsedMb: Number(
      ((metricMap.JSHeapUsedSize ?? 0) / 1024 / 1024).toFixed(2),
    ),
  };

  results.push(result);
  console.info("[aether:performance:result]", result);
}

await command("Emulation.setCPUThrottlingRate", { rate: 1 });
socket.close();

console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      device: "390x844 @2x",
      cpuThrottle: "4x",
      routes: results,
    },
    null,
    2,
  ),
);
