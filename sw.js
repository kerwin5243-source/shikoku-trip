// sw.js - 終極 PWA 離線機器人 (v5)
const CACHE_NAME = 'shikoku-pwa-v5';

// 💡 必須預先放入保險箱的檔案 (確保第一次打開就有基本畫面與資料)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './data/config.json',
  './data/checklists.json',
  './data/todos.json',
  './data/flights.json',
  './data/hotels.json',
  './data/gasstations.json',
  './data/itinerary.index.json',
  './data/souvenirs.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // 安裝時，立刻將上述核心檔案強制抓進快取
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => console.log('部分預載略過', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  // 啟動時清除舊版快取
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    ))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // 🚨 略過 Google API 同步 (絕對不能快取)
  if (event.request.url.includes('script.google')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 💡 關鍵：ignoreSearch: true 會無視網址後面的 ?v=123，成功找到快取檔案！
      const cachedResponse = await cache.match(event.request, { ignoreSearch: true });

      // 背景去網路上抓最新版
      const networkPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => { /* 斷網時安靜失敗 */ });

      // 如果保險箱有東西，立刻交給畫面 (秒開體驗)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 如果保險箱是空的，等網路的人回來
      try {
        const networkResponse = await networkPromise;
        if (networkResponse) return networkResponse;
        throw new Error('No network');
      } catch (err) {
        // 斷網且沒快取時：如果是切換網頁，回傳首頁
        if (event.request.mode === 'navigate') {
           const fallback = await cache.match('./index.html', { ignoreSearch: true }) || await cache.match('./', { ignoreSearch: true });
           if (fallback) return fallback;
        }
        return new Response("目前無網路，請恢復連線。", {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })
  );
});