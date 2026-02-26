// sw.js - 離線快取服務
const CACHE_NAME = 'shikoku-pwa-v1';

// 安裝時立刻接管控制權
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 啟動時清除舊版快取（未來如果有 v2, v3 可以自動清理）
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 核心機制：攔截所有連線請求
self.addEventListener('fetch', (event) => {
  // 不處理 POST 請求 (例如記帳上傳到 GAS 的動作)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // 策略：Network First (優先抓最新版，失敗才用快取)
    fetch(event.request)
      .then((response) => {
        // 如果有網路且成功抓到檔案，就偷偷存一份(Clone)到手機快取裡
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // 🚨 斷網或飛航模式時，會走到這裡！
        // 直接從手機快取裡把之前存好的 index.html 或圖示拿出來顯示
        return caches.match(event.request);
      })
  );
});