import express from "express";
import { sendMessage, getMessages } from "../controllers/message.controller.js";

const router = express.Router();

// Send a message (chat or guess)
router.post("/", sendMessage);

// Get all messages for a session
router.get("/:sessionId", getMessages);

export default router;
