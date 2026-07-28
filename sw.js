// Service worker for offline access to raselkobir1.github.io (Study Hub + homepage).
// Strategy: stale-while-revalidate — serve from cache instantly if available,
// and always refresh the cache from the network in the background when online.
const CACHE_NAME = 'studyhub-cache-v1';

const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/study-hub/index.html',
  '/study-hub/about.html',
  '/study-hub/agile.html',
  '/study-hub/ai.html',
  '/study-hub/angular.html',
  '/study-hub/auth.html',
  '/study-hub/aws.html',
  '/study-hub/azure.html',
  '/study-hub/csharp.html',
  '/study-hub/ddd.html',
  '/study-hub/design.html',
  '/study-hub/devops.html',
  '/study-hub/distsys.html',
  '/study-hub/docker.html',
  '/study-hub/english.html',
  '/study-hub/git.html',
  '/study-hub/kafka-mastery-bangla.html',
  '/study-hub/kubernetes.html',
  '/study-hub/linux.html',
  '/study-hub/microservices.html',
  '/study-hub/networking.html',
  '/study-hub/problemsolving.html',
  '/study-hub/rabbitmq.html',
  '/study-hub/react.html',
  '/study-hub/redis.html',
  '/study-hub/sql.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests (e.g. Google Fonts) go straight to network

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
