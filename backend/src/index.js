import dotenv from "dotenv";
import { connectDB } from "./config/connectDB.js";
import app from "./app.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import * as gameController from "./controllers/game.controller.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Expose io globally for controllers (not best practice, but simple for this context)
gameController.setSocketIO(io);
io.on("connection", (socket) => {
  // Join session room
  socket.on("joinSession", (code) => {
    socket.join(code);
  });
  // Optionally handle leave, disconnect, etc.
});

server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on http://localhost:${PORT}`);
});
