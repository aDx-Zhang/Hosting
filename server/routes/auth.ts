import { Router } from "express";
import { authService } from "../services/auth";
import { loginSchema, apiKeySchema, registerSchema } from "@shared/schema"; // Import registerSchema
import { log } from "../vite";
import { db } from '../db';
import { users as usersTable, apiKeys as apiKeysTable } from '@shared/schema';
import { eq, and, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hash, SALT_ROUNDS } from '../utils/hash'; // Assuming hash function exists


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

    // Check if user's API key is valid
    if (user.role !== 'admin') {
      const [activeKey] = await db.select()
        .from(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.userId, user.id),
            eq(apiKeysTable.active, 1),
            gte(apiKeysTable.expiresAt, new Date())
          )
        );

      if (!activeKey) {
        return res.status(403).json({
          error: "Subscription expired",
          message: "Your subscription has expired. Please contact an administrator."
        });
      }
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

// Get all users (admin only)
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

// Generate API key (admin only)
router.post("/generate-key", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAdmin = await authService.isAdmin(req.session.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const { durationDays } = apiKeySchema.parse(req.body);
    const key = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const [apiKey] = await db.insert(apiKeysTable)
      .values({
        key,
        userId: req.session.userId,
        expiresAt,
        active: 1
      })
      .returning();

    res.json(apiKey);
  } catch (error) {
    log(`Error generating API key: ${error}`);
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

// Get all API keys (admin only)
router.get("/api-keys", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAdmin = await authService.isAdmin(req.session.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const keys = await db.select().from(apiKeysTable);
    res.json(keys);
  } catch (error) {
    log(`Error fetching API keys: ${error}`);
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

// Add registration route with API key validation
router.post("/register", async (req, res) => {
  try {
    const { username, password, apiKey } = registerSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: "Username already exists",
        message: "Please choose a different username"
      });
    }

    // Validate API key
    const [validKey] = await db.select()
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.key, apiKey),
          eq(apiKeysTable.active, 1),
          gte(apiKeysTable.expiresAt, new Date())
        )
      );

    if (!validKey) {
      return res.status(400).json({
        error: "Invalid API key",
        message: "The provided API key is invalid or expired"
      });
    }

    // Create user
    const hashedPassword = await hash(password, SALT_ROUNDS);
    const [user] = await db.insert(usersTable)
      .values({
        username,
        password: hashedPassword,
        role: 'user'
      })
      .returning();

    // Update API key with user ID
    await db.update(apiKeysTable)
      .set({ userId: user.id })
      .where(eq(apiKeysTable.key, apiKey));

    // Set up session
    req.session.userId = user.id;

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    log(`Registration error: ${error}`);
    res.status(400).json({
      error: "Invalid request",
      message: "Please check your input and try again"
    });
  }
});

export { router as authRouter };