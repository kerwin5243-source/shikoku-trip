// sw.js - 離線快取服務 (終極防護版)
const CACHE_NAME = 'shikoku-pwa-v2'; // 更新版本號

// 1. 安裝時：立刻將核心網頁放入保險箱 (Pre-cache)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 強制寫入根目錄與 index.html，確保絕對有網頁可以顯示
      return cache.addAll([
        './',
        './index.html'
      ]).catch(() => console.log('部份預載略過，不影響運作'));
    })
  );
});

// 2. 啟動時：接管控制權，並清除舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))
      );
    })
  );
});

// 3. 攔截請求：Network First 搭配無敵 Fallback
self.addEventListener('fetch', (event) => {
  // 只攔截讀取 (GET) 動作，略過上傳 (POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 有網路：成功抓到檔案，偷存一份到快取
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(async () => {
        // 🚨 斷網飛航模式：進入快取尋寶
        const cachedRes = await caches.match(event.request);
        if (cachedRes) return cachedRes; 

        // 💡 核心防護：如果是「切換頁面/重新整理」但快取沒對上網址
        if (event.request.mode === 'navigate') {
          // 強制回傳我們剛剛在 install 階段鎖進保險箱的 index.html
          const fallback = await caches.match('./index.html') || await caches.match('./');
          if (fallback) return fallback;
        }

        // 最底線防護：連保險箱都空了，回傳純文字避免 Safari 出現 Returned response is null
        return new Response("目前處於無網路狀態，且尚未建立快取。", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({'Content-Type': 'text/plain; charset=utf-8'})
        });
      })
  );
});