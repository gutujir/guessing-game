import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRouter from "./routes/auth.route.js";
import gameRouter from "./routes/game.route.js";
import messageRouter from "./routes/message.route.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/games", gameRouter);
app.use("/api/messages", messageRouter);

export default app;
