// 青魚數學 Service Worker — 離線可用
// 更新網站內容後，把 VERSION 改一下，使用者就會拿到新版
const VERSION = 'qene-math-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];
const QR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    try { await c.add(new Request(QR_CDN, {mode: 'cors'})); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 頁面：網路優先（有網路時永遠最新），離線時用快取
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', res.clone());
        return res;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // 其他（圖示、QR 程式庫）：快取優先，背景更新
  if (url.origin === location.origin || url.href === QR_CDN) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      const net = fetch(req).then(async res => {
        if (res && (res.ok || res.type === 'opaque')) {
          (await caches.open(VERSION)).put(req, res.clone());
        }
        return res;
      }).catch(() => null);
      return cached || (await net) || Response.error();
    })());
  }
});
