const CACHE_NAME = "shikoku-pwa-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",

  // 你自己的 icon（按你實際路徑調整）
  "/icon/favicon-32.png",
  "/icon/favicon-16.png",
  "/icon/apple-touch-icon-180.png",
  "/icon/apple-touch-icon-167.png",
  "/icon/apple-touch-icon-152.png",
  "/icon/pwa-192.png",
  "/icon/pwa-512.png",
  "/icon/pwa-512-maskable.png"
];

// 安裝：預先快取核心資源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 啟用：清掉舊 cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// 抓取：HTML 用網路優先（確保更新），其他資源用 cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只處理同網域
  if (url.origin !== location.origin) return;

  // HTML：network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // 其他：cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
