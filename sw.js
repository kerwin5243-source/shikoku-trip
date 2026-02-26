// sw.js - 離線快取服務 (Vercel & iOS 專武版 v3)
const CACHE_NAME = 'shikoku-pwa-v3'; // 升級版本號強制更新

const CORE_URLS = [
  '/',
  '/index.html'
];

// 安裝：預先下載絕對路徑的核心檔案
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS).catch(() => console.log('預載略過')))
  );
});

// 啟動：清除所有舊的、卡住的快取
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))
    ))
  );
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  // 只攔截同網域的請求 (Vercel 本身)
  if (url.origin !== location.origin) return;

  // 針對 HTML 網頁切換 (飛航模式重新整理會觸發 navigate)
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        
        // 💡 無敵 Fallback：依序尋找快取，絕對不回傳 null 讓 Safari 崩潰
        const cachedRes = await cache.match(event.request);
        if (cachedRes) return cachedRes;
        
        const fallback1 = await cache.match('/');
        if (fallback1) return fallback1;
        
        const fallback2 = await cache.match('/index.html');
        if (fallback2) return fallback2;

        // 連保險箱都沒東西時，給純文字避免報錯
        return new Response("目前處於無網路狀態，請恢復連線。", { 
          status: 503, 
          headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
        });
      })
    );
  }
});