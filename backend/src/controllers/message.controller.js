import Message from "../models/message.model.js";
import { setSocketIO } from "./game.controller.js";

// Socket.io instance (set from game.controller.js)
let io = null;
try {
  // If setSocketIO has been called, get io from there
  io = globalThis.io;
} catch {}

export const sendMessage = async (req, res) => {
  try {
    const { sessionId, userId, content, type } = req.body;
    if (!sessionId || !content) {
      return res.status(400).json({ message: "Session and content required" });
    }
    const message = await Message.create({ sessionId, userId, content, type });
    // Emit real-time message to session room if io is available
    if (io) {
      io.to(sessionId.toString()).emit("newMessage", message);
    }
    res.status(201).json({ message: "Message sent", data: message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
