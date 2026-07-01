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

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("notification", () => cbRef.current());

    return () => {
      socket.disconnect();
    };
  }, [token]);
}
