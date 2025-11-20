import bcryptjs from "bcryptjs";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
import { signupSchema, loginSchema } from "../validation/auth.validation.js";

export const signup = async (req, res) => {
  const { error } = signupSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { first_name, last_name, username, email, password } = req.body;
  try {
    const userAlreadyExists = await userModel.findOne({ email });
    if (userAlreadyExists) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = new userModel({
      first_name,
      last_name,
      username,
      email,
      password: hashedPassword,
    });
    await user.save();
    generateTokenAndSetCookie(res, user._id);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    // Generate access token (JWT)
    generateTokenAndSetCookie(res, user._id);
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined,
        refreshToken: undefined,
      },
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Remove refresh token from user in DB if present
    if (req.userId) {
      await userModel.findByIdAndUpdate(req.userId, {
        $unset: { refreshToken: 1 },
      });
    }
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.send({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Issue new access token using refresh token
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token provided" });
    }
    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }
    // Find user and check stored refresh token matches
    const user = await userModel.findById(payload.userId);
    if (!user || user.refreshToken !== token) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }
    // Issue new access token
    generateTokenAndSetCookie(res, user._id);
    res.json({
      success: true,
      message: "Access token refreshed",
      refreshToken: token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select("-password");
    console.log("Check auth for userId:", req.userId);
    console.log("user in checkAuth:", user);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Check auth error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
