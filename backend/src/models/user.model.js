import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String },
    lastLogin: { type: Date, default: Date.now },
    refreshToken: { type: String },
    score: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
