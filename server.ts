import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcryptjs";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const OWNER_PHONE = process.env.OWNER_PHONE || "9832116317";

async function startServer() {
  console.log("Starting server initialization...");
  try {
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;

    app.use(express.json());
    app.use(cookieParser());

    console.log("Environment check:", {
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? "present" : "absent",
    });

    console.log("Reading Firebase config...");
    const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

    console.log("Initializing Firebase Admin...");
    let db: admin.firestore.Firestore;
    try {
      if (!admin.apps.length) {
        console.log("Initializing Firebase Admin with config projectId...");
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      
      const dbDefault = getFirestore(admin.app());
      const dbNamed = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
        ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
        : dbDefault;

      let namedSuccess = false;
      if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
        console.log(`Testing named database connection (${firebaseConfig.firestoreDatabaseId})...`);
        try {
          // A simple query to test connection
          await dbNamed.collection("settings").limit(1).get();
          console.log("Named database connection successful.");
          namedSuccess = true;
        } catch (e: any) {
          console.warn(`Named database connection failed (Error ${e.code}): ${e.message}`);
          // If it's a permission error, it might be because the rules aren't applied yet or the database is not accessible
        }
      }

      db = namedSuccess ? dbNamed : dbDefault;
      console.log(`Using ${namedSuccess ? "named" : "default"} database as primary.`);

      // Only test primary if we didn't succeed with named, or if named is not used
      if (!namedSuccess) {
        console.log("Testing primary database connection...");
        try {
          await db.collection("settings").limit(1).get();
          console.log("Primary database connection successful.");
        } catch (e: any) {
          console.error(`Primary database connection failed (Error ${e.code}): ${e.message}`);
        }
      }
    } catch (adminError: any) {
      console.error("Failed to initialize Firebase Admin:", adminError.message);
      throw adminError;
    }

    // API routes
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // Auth Routes
    app.post("/api/auth/verify-token", async (req, res) => {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: "No token provided" });

      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const email = decodedToken.email;
        const emailVerified = decodedToken.email_verified;

        if (!email) return res.status(400).json({ error: "No email in token" });
        if (!emailVerified) return res.status(403).json({ error: "Email not verified" });

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ message: "Login successful" });
      } catch (error) {
        console.error("Error verifying Firebase token:", error);
        res.status(401).json({ error: "Invalid Firebase token" });
      }
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

    // Master Password Routes
    app.post("/api/auth/verify-master-password", async (req, res) => {
      const { password } = req.body;
      if (!password) return res.status(400).json({ error: "Password is required" });

      const defaultPassword = "Chayanika@2026";

      try {
        let docSnap;
        const docRef = db.collection("settings").doc("access");
        try {
          docSnap = await docRef.get();
        } catch (dbError: any) {
          const errorMsg = dbError.message || String(dbError);
          
          // Check for NOT_FOUND or PERMISSION_DENIED in message or code
          if (
            errorMsg.includes("NOT_FOUND") || 
            dbError.code === 5 || 
            errorMsg.includes("not found") ||
            errorMsg.includes("PERMISSION_DENIED") ||
            dbError.code === 7 ||
            errorMsg.includes("permission denied")
          ) {
            if (password === defaultPassword) {
              const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
              res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
              });
              return res.json({ success: true });
            }
            return res.status(401).json({ error: "Invalid password" });
          }
          throw dbError;
        }

        if (!docSnap || !docSnap.exists) {
          if (password === defaultPassword) {
            const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.json({ success: true });
          }
          return res.status(401).json({ error: "Invalid password" });
        }

        const data = docSnap.data();
        if (!data || !data.password) {
          console.log("Access document exists but has no password field, checking default");
          if (password === defaultPassword) {
            const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.json({ success: true });
          }
          return res.status(401).json({ error: "Invalid password" });
        }

        const hashedPassword = data.password;
        
        if (typeof hashedPassword === "string" && hashedPassword.startsWith("$2")) {
          const isValid = await bcrypt.compare(password, hashedPassword);
          if (isValid) {
            const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.json({ success: true });
          }
        } else {
          if (password === hashedPassword) {
            const newHash = await bcrypt.hash(password, 10);
            await docRef.update({ password: newHash });
            const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "none",
              maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.json({ success: true });
          }
        }

        res.status(401).json({ error: "Invalid password" });
      } catch (error: any) {
        console.error("Error verifying master password:", error);
        res.status(500).json({ 
          error: "Internal server error", 
          details: error.message,
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined 
        });
      }
    });

    app.post("/api/auth/set-master-password", async (req, res) => {
      const { newPassword } = req.body;
      if (!newPassword) return res.status(400).json({ error: "New password is required" });

      const token = req.cookies.token;
      if (!token) return res.status(401).json({ error: "Not authorized" });

      try {
        jwt.verify(token, JWT_SECRET);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.collection("settings").doc("access").set({ password: hashedPassword }, { merge: true });
        res.json({ message: "Password updated successfully" });
      } catch (error) {
        console.error("Error setting master password:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting Vite in middleware mode...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("CRITICAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
