// sw.js - 終極 PWA 離線機器人 (v4)
const CACHE_NAME = 'shikoku-pwa-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    ))
  );
});

// 全面攔截器：優先給快取，背景偷偷更新
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // 🚨 略過 Google API 同步，確保這部分不被錯誤快取
  if (event.request.url.includes('script.google.com') || 
      event.request.url.includes('script.googleusercontent.com')) {
    return; 
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 1. 去保險箱找有沒有舊檔案
      const cachedResponse = await cache.match(event.request);

      // 2. 同時派人去網路上抓最新版
      const networkPromise = fetch(event.request).then((networkResponse) => {
        // 如果抓成功，偷偷把新資料放進保險箱，供下次秒開使用
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // 斷網時派出去的人會失敗，安靜忽略即可
      });

      // 3. 決策：如果保險箱有東西，立刻交給畫面 (秒開體驗！)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 4. 如果保險箱是空的，等網路的人回來
      try {
        const response = await networkPromise;
        if (response) return response;
        throw new Error('No response');
      } catch (err) {
        // 5. 斷網，且保險箱也是空的：防崩潰機制
        if (event.request.mode === 'navigate') {
           const fallback = await cache.match('/index.html') || await cache.match('/');
           if (fallback) return fallback;
        }
        return new Response("目前無網路，請恢復連線。", {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});