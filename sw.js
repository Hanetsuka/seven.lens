/**
 * svn.lens Studio — Offline Service Worker (PWA)
 * Menyimpan seluruh file aplikasi & font ke dalam cache perangkat agar dapat diakses 100% tanpa internet.
 */

const CACHE_NAME = 'svnlens-studio-offline-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon.svg',
    './css/style.css',
    './js/lut-presets.js',
    './js/ai-tools.js',
    './js/app.js',
    './sample-luts/Cinematic-Teal-Gold.cube',
    './sample-luts/Vintage-Creamy-Film.cube'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
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

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Kembalikan dari cache offline, sembari perbarui di latar belakang jika ada internet
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                    })
                    .catch(() => {});
                return cachedResponse;
            }

            // Jika belum ada di cache (misal file Google Fonts saat pertama kali dibuka), ambil & simpan ke cache
            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback jika benar-benar offline dan navigasi halaman
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
