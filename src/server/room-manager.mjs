// Server-side Room Manager & Turn State Machine
import { GameRules } from "./game-rules.mjs";

const TURN_DURATION_MS = 20000;

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room object
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  createRoom({ roomId, language = "vi", hostPlayer }) {
    const room = {
      id: roomId,
      language,
      status: "WAITING", // WAITING | STARTING | PLAYING | FINISHED
      players: [
        {
          id: hostPlayer.id,
          socketId: hostPlayer.socketId,
          nickname: hostPlayer.nickname || "Host",
          avatarColor: hostPlayer.avatarColor || "from-emerald-400 to-green-600",
          avatarFrame: hostPlayer.avatarFrame || "default",
          isHost: true,
          isReady: true,
          isEliminated: false,
          score: 0,
        },
      ],
      maxPlayers: 8,
      turnDurationMs: TURN_DURATION_MS,
      activePlayerIndex: 0,
      turnDeadline: 0,
      usedWords: [],
      wordChain: [],
      timerInterval: null,
      winner: null,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom({ roomId, player }) {
    let room = this.rooms.get(roomId);
    if (!room) {
      // Auto-create room if not existing
      return this.createRoom({ roomId, hostPlayer: player });
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error("Phòng đã đủ số lượng người chơi!");
    }

    // Check if player already in room (reconnect or tab switch)
    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex !== -1) {
      room.players[existingIndex].socketId = player.socketId;
      room.players[existingIndex].nickname = player.nickname;
      return room;
    }

    if (room.status === "PLAYING") {
      throw new Error("Trận đấu trong phòng này đã bắt đầu!");
    }

    room.players.push({
      id: player.id,
      socketId: player.socketId,
      nickname: player.nickname,
      avatarColor: player.avatarColor || "from-blue-400 to-indigo-600",
      avatarFrame: player.avatarFrame || "default",
      isHost: false,
      isReady: true,
      isEliminated: false,
      score: 0,
    });

    return room;
  }

  leaveRoom({ roomId, socketId }) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const leavingIdx = room.players.findIndex((p) => p.socketId === socketId);
    if (leavingIdx === -1) return room;

    const wasHost = room.players[leavingIdx].isHost;
    room.players.splice(leavingIdx, 1);

    if (room.players.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.rooms.delete(roomId);
      return null;
    }

    // Transfer host if host left
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    // If game in progress, check remaining players
    if (room.status === "PLAYING") {
      const activePlayers = room.players.filter((p) => !p.isEliminated);
      if (activePlayers.length <= 1) {
        this.finishGame(room, activePlayers[0] || null);
      }
    }

    return room;
  }

  startGame(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Không tìm thấy phòng!");

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player || !player.isHost) {
      throw new Error("Chỉ chủ phòng mới có quyền bắt đầu trận đấu!");
    }

    room.status = "PLAYING";
    room.players.forEach((p) => {
      p.isEliminated = false;
      p.score = 0;
    });

    const starterWord = GameRules.getRandomStarter(room.language);
    room.usedWords = [starterWord];
    room.wordChain = [
      {
        word: starterWord,
        senderName: "Hệ Thống",
        senderColor: "from-emerald-400 to-green-600",
        timestamp: Date.now(),
      },
    ];

    room.activePlayerIndex = 0;
    room.turnDeadline = Date.now() + room.turnDurationMs;
    room.winner = null;

    this.startTurnTimer(room);
    return room;
  }

  startTurnTimer(room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.timerInterval = setInterval(() => {
      const remainingMs = room.turnDeadline - Date.now();

      if (remainingMs <= 0) {
        // Player TIMEOUT -> Eliminate active player!
        const eliminatedPlayer = room.players[room.activePlayerIndex];
        if (eliminatedPlayer) {
          eliminatedPlayer.isEliminated = true;
          this.io.to(room.id).emit("game:player_eliminated", {
            player: eliminatedPlayer,
            reason: "Hết thời gian lượt đấu!",
          });
        }

        const activePlayers = room.players.filter((p) => !p.isEliminated);
        if (activePlayers.length <= 1) {
          this.finishGame(room, activePlayers[0] || null);
          return;
        }

        // Advance to next active player
        this.advanceTurn(room);
        this.io.to(room.id).emit("game:state", this.serializeRoom(room));
      }
    }, 1000);
  }

  advanceTurn(room) {
    let nextIdx = (room.activePlayerIndex + 1) % room.players.length;
    while (room.players[nextIdx].isEliminated) {
      nextIdx = (nextIdx + 1) % room.players.length;
    }

    room.activePlayerIndex = nextIdx;
    room.turnDeadline = Date.now() + room.turnDurationMs;
  }

  async submitWord({ roomId, socketId, word }) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "PLAYING") {
      throw new Error("Trận đấu chưa bắt đầu!");
    }

    const activePlayer = room.players[room.activePlayerIndex];
    if (!activePlayer || activePlayer.socketId !== socketId) {
      throw new Error("Chưa tới lượt của bạn!");
    }

    const lastWordObj = room.wordChain[room.wordChain.length - 1];
    const prevWord = lastWordObj ? lastWordObj.word : null;

    const validation = await GameRules.validateWord(word, prevWord, room.usedWords, room.language);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    // Word is valid!
    const normalized = validation.normalizedWord;
    room.usedWords.push(normalized);
    room.wordChain.push({
      word: normalized,
      senderName: activePlayer.nickname,
      senderColor: activePlayer.avatarColor,
      timestamp: Date.now(),
    });

    activePlayer.score += 10;

    // Advance to next player
    this.advanceTurn(room);
    return { valid: true, room };
  }

  finishGame(room, winner) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.status = "FINISHED";
    room.winner = winner;

    this.io.to(room.id).emit("game:finished", {
      winner,
      finalChain: room.wordChain,
    });
  }

  serializeRoom(room) {
    return {
      id: room.id,
      language: room.language,
      status: room.status,
      players: room.players,
      activePlayerIndex: room.activePlayerIndex,
      turnDeadline: room.turnDeadline,
      turnDurationMs: room.turnDurationMs,
      wordChain: room.wordChain,
      winner: room.winner,
    };
  }
}
