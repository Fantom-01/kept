const CACHE_NAME = "kept-shell-v2";
const APP_SHELL = ["/", "/app", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	if (new URL(event.request.url).origin !== self.location.origin) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				const copy = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
				return response;
			})
			.catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
	);
});

self.addEventListener("push", (event) => {
	const payload = event.data?.json() || {
		title: "A habit is waiting",
		body: "A small check-in keeps your record honest.",
	};
	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: "/pwa-192.png",
			badge: "/notification-badge.png",
			data: { url: payload.url || "/app" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/app"));
});
