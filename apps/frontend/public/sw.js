// Service worker dédié aux push notifications (pas un PWA complet : pas de cache
// offline volontairement, juste la réception des push et le clic dessus).
// Enregistré depuis lib/use-push-notifications.ts.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "LeFinancier", body: event.data.text() };
  }

  const { title, body, link } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "LeFinancier", {
      body: body || "",
      icon: "/logo_court.png",
      badge: "/logo_court.png",
      data: { link },
    }),
  );
});

// Clic sur la notification : focus un onglet déjà ouvert sur le lien visé s'il
// existe, sinon en ouvre un nouveau. Sans lien, focus/ouvre simplement l'app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = link || self.registration.scope;

      for (const client of clientsList) {
        if (client.url === target && "focus" in client) {
          return client.focus();
        }
      }
      if (clientsList.length > 0 && "focus" in clientsList[0]) {
        clientsList[0].focus();
        if (link && "navigate" in clientsList[0]) {
          return clientsList[0].navigate(link);
        }
        return;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })(),
  );
});
