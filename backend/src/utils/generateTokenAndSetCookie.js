import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("token", token, {
    httpOnly: true, // prevents XSS attacks
    secure: process.env.NODE_ENV === "production", // set to true in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // allow cross-site cookies in production
    maxAge: 1 * 60 * 60 * 1000, // 1 hour
  });
  return token;
};
