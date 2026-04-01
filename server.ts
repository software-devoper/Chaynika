import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const OWNER_PHONE = process.env.OWNER_PHONE || "9832116317";

// Mock OTP storage
const otpStore: Record<string, { otp: string; expiry: number }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OTP Routes
  app.post("/api/auth/send-otp", (req, res) => {
    const { phone } = req.body;
    console.log(`Received OTP request for phone: ${phone}`);

    // For testing/demo, we'll allow any 10-digit number
    // In production, we would restrict to OWNER_PHONE
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    console.log(`------------------------------------`);
    console.log(`OTP for ${phone}: ${otp}`);
    console.log(`------------------------------------`);
    
    // In a real app, we'd use an SMS provider here
    // For now, we just mock success
    res.json({ message: "OTP sent successfully (Check server console for OTP)" });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    const stored = otpStore[phone];

    // Allow 123456 as a universal test OTP
    const isTestOtp = otp === "123456";

    if (!isTestOtp && (!stored || stored.otp !== otp || stored.expiry < Date.now())) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    delete otpStore[phone];
    const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Login successful" });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ user: decoded });
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
