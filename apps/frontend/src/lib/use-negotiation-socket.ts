"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./auth-context";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";

export function useNegotiationSocket(onNotification: () => void) {
  const { token } = useAuth();
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    if (!token) return;

    // auth en callback (pas un objet figé) : relu à chaque tentative de reconnexion
    // automatique de socket.io-client (ex: après un redémarrage du backend), pour éviter
    // de retenter indéfiniment avec un access token expiré.
    const socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: sessionStorage.getItem("accessToken") ?? token }),
    });
    socket.on("notification", () => cbRef.current());

    return () => {
      socket.disconnect();
    };
  }, [token]);
}
