import { Router } from "express";
import { authService } from "../services/auth";
import { loginSchema } from "@shared/schema";
import { log } from "../vite";
import { db } from '../db';
import { users as usersTable } from '@shared/schema';

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router = Router();

// Login endpoint with enhanced error handling
router.post("/login", async (req, res) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    log(`Login attempt received for user: ${validatedData.username}`);

    const user = await authService.validateUser(validatedData.username, validatedData.password);

    if (!user) {
      log(`Login failed - invalid credentials for user: ${validatedData.username}`);
      return res.status(401).json({ 
        error: "Invalid credentials",
        message: "The username or password you entered is incorrect."
      });
    }

    // Set up session
    req.session.userId = user.id;
    log(`Login successful for user: ${validatedData.username}`);

    res.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    log(`Login error: ${error}`);
    res.status(400).json({ 
      error: "Invalid request",
      message: "Please check your input and try again."
    });
  }
});

// Check session status
router.get("/session", async (req, res) => {
  if (req.session.userId) {
    try {
      const user = await authService.getUser(req.session.userId);
      if (user) {
        res.json({ 
          authenticated: true, 
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      log(`Session check error: ${error}`);
      res.status(401).json({ authenticated: false });
    }
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Added route for fetching users
router.get("/users", async (req, res) => {
  // Check if user is admin
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAdmin = await authService.isAdmin(req.session.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const users = await db.select().from(usersTable);
    res.json(users);
  } catch (error) {
    log(`Error fetching users: ${error}`);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export { router as authRouter };