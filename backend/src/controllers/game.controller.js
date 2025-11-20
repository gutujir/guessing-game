import GameSession from "../models/GameSession.model.js";

// 1. Create a new game session
export const createSession = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: "userId and code required" });
    }
    // Check if user exists (optional, but recommended)
    // const user = await User.findById(userId);
    // if (!user) return res.status(404).json({ message: "User not found" });

    // Check if code is unique
    const exists = await GameSession.findOne({ code });
    if (exists) return res.status(409).json({ message: "Session code exists" });

    // Create session
    const session = await GameSession.create({
      code,
      gameMaster: userId,
      players: [userId],
      scores: [{ userId, score: 0 }],
      status: "waiting",
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Join a game session
export const joinSession = async (req, res) => {
  try {
    const { userId, code } = req.body;
    const session = await GameSession.findOne({ code });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "waiting") {
      return res.status(400).json({ message: "Game already started" });
    }
    if (session.players.includes(userId)) {
      return res.status(409).json({ message: "Already joined" });
    }
    session.players.push(userId);
    session.scores.push({ userId, score: 0 });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// In-memory map to track session timeouts
const sessionTimeouts = {};

// Socket.io instance (set from index.js)
let io = null;
export function setSocketIO(ioInstance) {
  io = ioInstance;
}

// 3. Start a game session (game master only)
export const startSession = async (req, res) => {
  try {
    const { code, userId, question, answer } = req.body;
    const session = await GameSession.findOne({ code });
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Only game master can start
    if (session.gameMaster.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only game master can start the session" });
    }

    // At least 3 players required
    if (session.players.length < 3) {
      return res
        .status(400)
        .json({ message: "At least 3 players required to start the game" });
    }

    // Only allow starting if status is 'waiting'
    if (session.status !== "waiting") {
      return res.status(400).json({ message: "Game already started or ended" });
    }

    // Set up session for game start
    session.status = "in-progress";
    session.question = question;
    session.answer = answer;
    session.startTime = new Date();
    session.winner = null;
    // Give each player 3 attempts
    session.attempts = session.players.map((uid) => ({
      userId: uid,
      attemptsLeft: 3,
    }));

    await session.save();

    // Set a 60-second timeout to end the session if not already ended
    if (sessionTimeouts[code]) {
      clearTimeout(sessionTimeouts[code]);
    }

    sessionTimeouts[code] = setTimeout(async () => {
      try {
        const s = await GameSession.findOne({ code });
        if (s && s.status === "in-progress") {
          s.status = "ended";
          s.winner = null;
          s.endTime = new Date();
          await s.save();
          // Real-time notify players in the session room
          if (io) {
            io.to(code).emit("sessionTimeout", {
              code,
              message: "Session timed out",
            });
          }
        }
      } catch (e) {
        // Log error
        console.error("Session timeout error:", e);
      }
      delete sessionTimeouts[code];
    }, 60000); // 60 seconds

    res.status(200).json({ message: "Game started", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Submit a guess
export const submitGuess = async (req, res) => {
  try {
    const { code, userId, guess } = req.body;
    const session = await GameSession.findOne({ code });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "in-progress") {
      return res.status(400).json({ message: "Game not in progress" });
    }
    if (session.winner) {
      return res.status(400).json({ message: "Game already won" });
    }
    const attempt = session.attempts.find(
      (a) => a.userId.toString() === userId
    );
    if (!attempt || attempt.attemptsLeft < 1) {
      return res.status(400).json({ message: "No attempts left" });
    }
    if (guess.trim().toLowerCase() === session.answer.trim().toLowerCase()) {
      // Correct guess
      session.status = "ended";
      session.winner = userId;
      const scoreObj = session.scores.find(
        (s) => s.userId.toString() === userId
      );
      if (scoreObj) scoreObj.score += 10;
      await session.save();
      return res
        .status(200)
        .json({ message: "Correct! You win!", winner: userId, session });
    } else {
      attempt.attemptsLeft -= 1;
      await session.save();
      return res
        .status(200)
        .json({ message: "Wrong guess", attemptsLeft: attempt.attemptsLeft });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Get session details (with player count and scores)
export const getSession = async (req, res) => {
  try {
    const { code } = req.params;
    const session = await GameSession.findOne({ code })
      .populate("players", "username")
      .populate("gameMaster", "username");
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.status(200).json({
      session,
      playerCount: session.players.length,
      scores: session.scores,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Get all sessions (for lobby, with player count)
export const getAllSessions = async (req, res) => {
  try {
    const sessions = await GameSession.find().select("code status players");
    res.status(200).json(
      sessions.map((s) => ({
        code: s.code,
        status: s.status,
        playerCount: s.players.length,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. Leave a session (rotate game master, delete if empty)
export const leaveSession = async (req, res) => {
  try {
    const { code, userId } = req.body;
    const session = await GameSession.findOne({ code });
    if (!session) return res.status(404).json({ message: "Session not found" });
    session.players = session.players.filter(
      (uid) => uid.toString() !== userId
    );
    session.scores = session.scores.filter(
      (s) => s.userId.toString() !== userId
    );
    session.attempts = session.attempts.filter(
      (a) => a.userId.toString() !== userId
    );
    // If game master left, assign new game master
    if (
      session.gameMaster.toString() === userId &&
      session.players.length > 0
    ) {
      session.gameMaster = session.players[0];
    }
    await session.save();
    // Delete session if no players left
    if (session.players.length === 0) {
      await session.deleteOne();
      return res.status(200).json({ message: "Session deleted" });
    }
    res.status(200).json({ message: "Left session", session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ...existing code...
