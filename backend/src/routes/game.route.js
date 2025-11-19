import express from "express";
import {
  createSession,
  joinSession,
  startSession,
  submitGuess,
  getSession,
  leaveSession,
  getAllSessions,
} from "../controllers/game.controller.js";

const router = express.Router();

// Create a new game session
router.post("/create", createSession);

// Join a game session
router.post("/join", joinSession);

// Start a game session (game master only)
router.post("/start", startSession);

// Submit a guess
router.post("/guess", submitGuess);

// Get session details
router.get("/:code", getSession);

// Leave a session
router.post("/leave", leaveSession);

// Get all sessions (for lobby)
router.get("/", getAllSessions);

export default router;
