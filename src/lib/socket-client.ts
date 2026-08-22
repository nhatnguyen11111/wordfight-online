"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== "undefined") {
    socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket Client] Connected successfully:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket Client] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket Client] Connection error:", err.message);
    });
  }

  return socket!;
};
