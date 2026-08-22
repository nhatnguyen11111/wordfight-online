// Socket.IO Server Event Router
import { RoomManager } from "./room-manager.mjs";

export function setupSocketServer(io) {
  const roomManager = new RoomManager(io);

  // Matchmaking Queues (language -> array of sockets)
  const matchmakingQueues = {
    vi: [],
    en: [],
  };

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── 1. Global Chat ──────────────────────────────────────────
    socket.on("chat:global:send", (data) => {
      if (!data || !data.text || typeof data.text !== "string") return;

      const message = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        sender: String(data.sender || "Khách").slice(0, 20),
        avatarColor: data.avatarColor || "from-emerald-400 to-green-600",
        text: String(data.text).slice(0, 200),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      // Broadcast to ALL connected clients
      io.emit("chat:global:message", message);
    });

    // ── 2. Room Management ──────────────────────────────────────
    socket.on("room:create", ({ roomId, language, player }, callback) => {
      try {
        const room = roomManager.createRoom({
          roomId,
          language: language || "vi",
          hostPlayer: { ...player, socketId: socket.id },
        });

        socket.join(roomId);
        if (typeof callback === "function") callback({ success: true, room: roomManager.serializeRoom(room) });
        io.to(roomId).emit("room:updated", roomManager.serializeRoom(room));
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, error: err.message });
      }
    });

    socket.on("room:join", ({ roomId, player }, callback) => {
      try {
        const room = roomManager.joinRoom({
          roomId,
          player: { ...player, socketId: socket.id },
        });

        socket.join(roomId);
        if (typeof callback === "function") callback({ success: true, room: roomManager.serializeRoom(room) });
        io.to(roomId).emit("room:updated", roomManager.serializeRoom(room));
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, error: err.message });
      }
    });

    socket.on("room:get", ({ roomId }, callback) => {
      const room = roomManager.getRoom(roomId);
      if (room && typeof callback === "function") {
        callback({ success: true, room: roomManager.serializeRoom(room) });
      } else if (typeof callback === "function") {
        callback({ success: false, error: "Phòng không tồn tại!" });
      }
    });

    socket.on("room:leave", ({ roomId }) => {
      const updated = roomManager.leaveRoom({ roomId, socketId: socket.id });
      socket.leave(roomId);
      if (updated) {
        io.to(roomId).emit("room:updated", roomManager.serializeRoom(updated));
      }
    });

    // ── 3. In-Room Chat ─────────────────────────────────────────
    socket.on("chat:room:send", ({ roomId, text, sender }) => {
      if (!roomId || !text) return;
      const message = {
        id: "room_msg_" + Math.random().toString(36).substring(2, 9),
        sender: String(sender || "Ẩn danh").slice(0, 20),
        text: String(text).slice(0, 200),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      io.to(roomId).emit("chat:room:message", message);
    });

    // ── 4. Live Game Events ─────────────────────────────────────
    socket.on("game:start", ({ roomId }, callback) => {
      try {
        const room = roomManager.startGame(roomId, socket.id);
        const serialized = roomManager.serializeRoom(room);
        io.to(roomId).emit("game:started", serialized);
        io.to(roomId).emit("game:state", serialized);
        if (typeof callback === "function") callback({ success: true });
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, error: err.message });
      }
    });

    socket.on("game:submit_word", async ({ roomId, word }, callback) => {
      try {
        const res = await roomManager.submitWord({ roomId, socketId: socket.id, word });
        if (!res.valid) {
          if (typeof callback === "function") callback({ valid: false, error: res.error });
          socket.emit("game:word_rejected", { error: res.error });
          return;
        }

        const serialized = roomManager.serializeRoom(res.room);
        io.to(roomId).emit("game:word_accepted", {
          wordChain: serialized.wordChain,
          activePlayerIndex: serialized.activePlayerIndex,
          turnDeadline: serialized.turnDeadline,
        });
        io.to(roomId).emit("game:state", serialized);

        if (typeof callback === "function") callback({ valid: true });
      } catch (err) {
        if (typeof callback === "function") callback({ valid: false, error: err.message });
        socket.emit("game:word_rejected", { error: err.message });
      }
    });

    // ── 5. Quick 1vs1 Online Matchmaking ────────────────────────
    socket.on("matchmaking:find", ({ language = "vi", player }, callback) => {
      const queue = matchmakingQueues[language] || matchmakingQueues.vi;

      // Remove socket if already in queue
      const existingIdx = queue.findIndex((q) => q.socket.id === socket.id);
      if (existingIdx !== -1) queue.splice(existingIdx, 1);

      if (queue.length > 0) {
        // MATCH FOUND!
        const opponent = queue.shift();
        const generatedRoomId = Math.floor(10000 + Math.random() * 90000).toString();

        const room = roomManager.createRoom({
          roomId: generatedRoomId,
          language,
          hostPlayer: { ...opponent.player, socketId: opponent.socket.id },
        });

        roomManager.joinRoom({
          roomId: generatedRoomId,
          player: { ...player, socketId: socket.id },
        });

        opponent.socket.join(generatedRoomId);
        socket.join(generatedRoomId);

        // Notify both players
        opponent.socket.emit("matchmaking:matched", { roomId: generatedRoomId, opponent: player });
        socket.emit("matchmaking:matched", { roomId: generatedRoomId, opponent: opponent.player });

        if (typeof callback === "function") callback({ success: true, roomId: generatedRoomId });
      } else {
        // Enqueue player
        queue.push({ socket, player });
        if (typeof callback === "function") callback({ success: true, queued: true });
      }
    });

    socket.on("matchmaking:cancel", ({ language = "vi" }) => {
      const queue = matchmakingQueues[language] || matchmakingQueues.vi;
      const idx = queue.findIndex((q) => q.socket.id === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    });

    // ── Disconnect ──────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Remove from matchmaking queues
      ["vi", "en"].forEach((l) => {
        matchmakingQueues[l] = matchmakingQueues[l].filter((q) => q.socket.id !== socket.id);
      });

      // Find and leave all rooms socket was in
      roomManager.rooms.forEach((r, rId) => {
        const inRoom = r.players.some((p) => p.socketId === socket.id);
        if (inRoom) {
          const updated = roomManager.leaveRoom({ roomId: rId, socketId: socket.id });
          if (updated) {
            io.to(rId).emit("room:updated", roomManager.serializeRoom(updated));
          }
        }
      });
    });
  });
}
