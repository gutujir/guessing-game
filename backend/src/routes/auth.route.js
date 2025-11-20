import express from "express";
import {
  checkAuth,
  login,
  logout,
  refreshToken,
  signup,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// router.get("/check-auth", verifyToken, checkAuth);
router.post("/signup", signup);
router.post("/login", login);

router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

router.get("/check-auth", verifyToken, checkAuth);

export default router;
