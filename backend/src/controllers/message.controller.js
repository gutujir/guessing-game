import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { sessionId, userId, content, type } = req.body;
    if (!sessionId || !content) {
      return res.status(400).json({ message: "Session and content required" });
    }
    const message = await Message.create({ sessionId, userId, content, type });
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
