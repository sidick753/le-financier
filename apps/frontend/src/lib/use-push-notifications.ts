"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { api } from "./api";

const SW_URL = "/sw.js";

// Web Push exige la clé VAPID en Uint8Array, le backend ne la donne qu'en base64
// URL-safe (voir PushController.getPublicKey côté backend).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { token } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (!supported) {
      setIsChecking(false);
      return;
    }
    setPermission(Notification.permission);

    navigator.serviceWorker
      .getRegistration(SW_URL)
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {})
      .finally(() => setIsChecking(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (!token || !isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.register(SW_URL);
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      const { publicKey } = await api.get<{ publicKey: string }>("/push/vapid-public-key", token);
      if (!publicKey) throw new Error("Les notifications push ne sont pas configurées côté serveur pour le moment.");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast : lib.dom type applicationServerKey en BufferSource, mais le
        // Uint8Array<ArrayBufferLike> retourné par urlBase64ToUint8Array ne
        // s'y unifie pas toujours selon la version de TS — la valeur runtime
        // est correcte (Uint8Array), seul le typage est trop strict ici.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      await api.post(
        "/push/subscribe",
        { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth }, userAgent: navigator.userAgent },
        token,
      );
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, [token, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (token) await api.post("/push/unsubscribe", { endpoint }, token).catch(() => {});
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [token, isSupported]);

  return { isSupported, isChecking, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
