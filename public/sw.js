/* HammaBop Service Worker — #3 Offline rejim & kesh */
const SHELL = "hammabop-shell-v1";
const RUNTIME = "hammabop-runtime-v1";
const IMG = "hammabop-img-v1";

const SHELL_ASSETS = ["/", "/index.html", "/version.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL, RUNTIME, IMG].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Supabase API / auth — hech qachon keshlamaymiz
  if (url.pathname.includes("/auth/") || url.hostname.includes("supabase.co")) return;

  // Navigatsiya — network-first, offline bo'lsa keshlangan shell
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Rasmlar — cache-first (katalog offline ko'rinishi uchun)
  if (request.destination === "image") {
    e.respondWith(
      caches.open(IMG).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // JS/CSS/shrift — stale-while-revalidate
  if (["script", "style", "font"].includes(request.destination)) {
    e.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const hit = await cache.match(request);
        const fetching = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fetching;
      })
    );
  }
});
