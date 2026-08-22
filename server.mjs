// Custom Next.js + Socket.IO Server
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { setupSocketServer } from "./src/server/socket-server.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    await app.prepare();

    const httpServer = createServer((req, res) => {
      handle(req, res);
    });

    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    // Setup Socket.IO game handlers
    setupSocketServer(io);

    httpServer.listen(port, hostname, () => {
      console.log(`> 🎮 WordFight Server ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
      console.log(`> ⚡ Socket.IO real-time engine attached and active!`);
    });

    httpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        const altPort = port + 1;
        console.warn(`> ⚠ Port ${port} is in use, trying port ${altPort}...`);
        httpServer.listen(altPort, hostname, () => {
          console.log(`> 🎮 WordFight Server ready on http://localhost:${altPort}`);
        });
      } else {
        console.error(err);
      }
    });
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

startServer();
