// Service Worker — Web Push (App de Escalas Getsemani)
const CACHE = "getsemani-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/icons/icon-192.png"])));
  self.skipWaiting();
});

// Limpa caches de versoes antigas (evita servir HTML velho apontando pra
// chunks /_next/static que nao existem mais apos um deploy -> client-side exception).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// Push (FR-014/015): exibe notificacao
self.addEventListener("push", (event) => {
  let data = { title: "Getsemani", body: "Você tem uma atualização", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) if (c.url.includes(url) && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});

// Handler de fetch: o Chrome so considera o app instalavel se o SW tiver um.
// Continua sem cachear HTML autenticado (paginas sao force-dynamic) — so
// intercepta navegacao pra servir a pagina estatica de offline quando a rede cai.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
