import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attemptsLeft: { type: Number, default: 3 },
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const gameSessionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    gameMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["waiting", "in-progress", "ended"],
      default: "waiting",
    },
    question: { type: String },
    answer: { type: String },
    attempts: [attemptSchema],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startTime: { type: Date },
    endTime: { type: Date },
    scores: [scoreSchema],
  },
  { timestamps: true }
);

export default mongoose.model("GameSession", gameSessionSchema);
