/**
 * svn.lens Studio — Offline Service Worker (PWA)
 * Menggunakan strategi Network-First untuk file aplikasi agar pembaruan langsung aktif saat online,
 * dan fallback ke Cache perangkat saat offline 100%.
 */

const CACHE_NAME = 'svnlens-studio-offline-v51';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './css/style.css',
    './js/heic2any.min.js',
    './js/sample-photos.js',
    './js/lut-presets.js',
    './js/ai-tools.js',
    './js/pro-studio.js',
    './js/stickers.js',
    './js/app.js',
    './js/camera-studio.js',
    './assets/stickers/ribbon_pink.png',
    './assets/stickers/ribbon_cream.png',
    './assets/stickers/ribbon_red.png',
    './assets/stickers/flower_rose_real.png',
    './assets/stickers/flower_daisy_real.png',
    './assets/stickers/flower_tulip_real.png',
    './assets/stickers/flower_frangipani_real.png',
    './assets/stickers/flower_sakura_real.png',
    './assets/stickers/flower_hibiscus_real.png',
    './assets/stickers/flower_sunflower_real.png',
    './assets/stickers/flower_peony_real.png',
    './assets/stickers/flower_hydrangea_real.png',
    './sample-luts/Cinematic-Teal-Gold.cube',
    './sample-luts/Vintage-Creamy-Film.cube'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    // Biarkan CDN eksternal & model AI HuggingFace (RMBG-1.4) di-cache permanen oleh transformers-cache secara langsung
    const reqUrl = new URL(event.request.url);
    if (reqUrl.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cloned);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
