/* Lucky Draw offline cache (scope /lottery/).
   Hashed build assets never change, so they are served cache-first. The page
   itself is network-first so an update still reaches the iPad, but if the
   network is slow (>4s) or gone it falls back to the cached copy. */
const CACHE = "pn-lucky-draw";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(url.pathname.startsWith("/assets/") ? cacheFirst(req) : networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function fromCache(req, cache) {
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit || req.mode !== "navigate") return hit;
  return (await cache.match("/lottery/")) || (await cache.match("/lottery"));
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  net.catch(() => {});
  try {
    const first = await Promise.race([net, new Promise((r) => setTimeout(r, 4000, null))]);
    if (first) return first;
    return (await fromCache(req, cache)) || (await net);
  } catch {
    return (await fromCache(req, cache)) || Response.error();
  }
}
