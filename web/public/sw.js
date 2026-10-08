/*
 * 健澜科技 jlmedaios - 移动护理 PWA Service Worker（M16-A）
 * 轻量手动实现（不引入 vite-plugin-pwa）：
 *  - 安装时预缓存 app shell（/、/index.html、/favicon.svg、/manifest.webmanifest）；
 *  - 运行时：同源 GET 静态资源 stale-while-revalidate；导航请求离线兜底到缓存的 index.html；
 *  - /api/ 与非 GET 请求一律 network-only（绝不缓存鉴权/医嘱/给药数据，保证新鲜与合规）。
 */
const CACHE = 'm16a-mobile-nursing-v1';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // API / 鉴权数据绝不缓存：始终直连网络，离线时由前端离线队列兜底。
  if (url.pathname.startsWith('/api/')) return;

  // 导航请求：网络优先，失败回退缓存 shell（离线兜底）。
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // 静态资源：stale-while-revalidate。
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
