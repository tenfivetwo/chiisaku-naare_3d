/* ころころまめまる — オフライン用 Service Worker（本体 web/sw.js と おなじ 考え方）
 * ゲーム（index.html）は「まずネット、だめならキャッシュ」。index.html を 差しかえるだけで 新しい 版が 届く。
 * VERSION を 上げるのは アイコンや manifest を 変えた ときだけで よい。
 * キャッシュの 名前は "korokoro-" で はじめる（本体の "mamemaru-" と まざらない）。
 */
const VERSION = "v1";
const CACHE = "korokoro-" + VERSION;
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/icon-1024.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  // 自分（korokoro-）の 古い キャッシュだけ けす。本体の キャッシュには 手を 出さない
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("korokoro-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function isPage(req){
  if (req.mode === "navigate") return true;
  const u = new URL(req.url);
  return u.pathname.endsWith("/") || u.pathname.endsWith("/index.html");
}
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;   // 本体の ページには 手を 出さない
  if (isPage(e.request)){
    e.respondWith(fetch(e.request).then(res => {
        if (res && res.status === 200){ const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
        return res;
      }).catch(() => caches.match("./index.html", { ignoreSearch: true }).then(hit => hit || caches.match("./", { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res && res.status === 200 && res.type === "basic"){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
