// K.P. Enterprises — service worker.
// Lets phones install the app. Always tries the network first so staff get the latest version;
// falls back to the saved copy of the app screens if the connection drops.
// Bills themselves always go straight to Supabase (never cached here).
const CACHE = 'kpe-shell-v8';
const SHELL = [
  './', 'index.html', 'css/login.css', 'css/app.css', 'css/invoice.css',
  'js/config.js', 'js/utils.js', 'js/hsn-search.js', 'data/hsn.json', 'js/invoice.js', 'js/db.js', 'js/app.js',
  'vendor/supabase.min.js', 'vendor/html2pdf.bundle.min.js',
  'assets/kpe-logo.png', 'assets/kpe-mark.png', 'assets/favicon.png', 'assets/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase & fonts: untouched
  // pages: try the network for 4 s, then use the saved copy (works offline / on weak signal)
  const net = e.request.mode === 'navigate'
    ? Promise.race([fetch(e.request), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))])
    : fetch(e.request);
  e.respondWith(
    net
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
