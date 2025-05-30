import { Router } from "express";
import { authService } from "../services/auth";
import { loginSchema, apiKeySchema, registerSchema } from "@shared/schema";
import { log } from "../vite";
import { db } from '../db';
import { users as usersTable, apiKeys as apiKeysTable } from '@shared/schema';
import { eq, and, desc, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hash } from '../utils/hash';

const router = Router();

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    log(`Login attempt for user: ${validatedData.username}`);

    const user = await authService.validateUser(validatedData.username, validatedData.password);

    if (!user) {
      return res.status(401).json({ 
        error: "Invalid credentials" 
      });
    }

    // Set up session
    req.session.userId = user.id;

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
    res.status(400).json({ error: "Invalid request" });
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

    log(`Generating new API key with ${durationDays} days duration`);

    const [apiKey] = await db.insert(apiKeysTable)
      .values({
        key,
        durationDays,
        active: 1,
        userId: null,
        expiresAt: null
      })
      .returning();

    log(`Generated API key: ${key}`);
    res.json(apiKey);
  } catch (error) {
    log(`Error generating API key: ${error}`);
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

// Registration route with raw password storage
router.post("/register", async (req, res) => {
  try {
    const { username, password, apiKey } = registerSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    log(`Registration attempt - Username: ${username}, API Key: ${apiKey}, IP: ${ipAddress}`);

    // Check if username exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .execute();

    if (existingUser.length > 0) {
      log('Registration failed: Username already exists');
      return res.status(400).json({
        error: "Username already exists"
      });
    }

    // Simplified API key validation
    const [key] = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.key, apiKey))
      .execute();

    log(`API key found: ${JSON.stringify(key)}`);

    if (!key || key.userId !== null || key.active !== 1) {
      log('Registration failed: Invalid or used API key');
      return res.status(400).json({
        error: "Invalid or already used API key"
      });
    }

    // Create user with both hashed and raw password
    const hashedPassword = await hash(password);
    const [user] = await db.insert(usersTable)
      .values({
        username,
        password: hashedPassword,
        rawPassword: password, 
        role: 'user',
        ipAddress
      })
      .returning();

    log(`User created successfully: ${user.username}`);

    // Update API key
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + key.durationDays);

    await db.update(apiKeysTable)
      .set({
        userId: user.id,
        expiresAt: expiresAt
      })
      .where(eq(apiKeysTable.id, key.id))
      .execute();

    log(`API key updated with user ID and expiration`);

    // Set up session
    req.session.userId = user.id;

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        password: user.rawPassword 
      }
    });
  } catch (error) {
    log(`Registration error: ${error}`);
    res.status(400).json({ error: "Registration failed" });
  }
});

// Delete API key (admin only)
router.delete("/api-keys/:id", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAdmin = await authService.isAdmin(req.session.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const keyId = parseInt(req.params.id);
    await db.delete(apiKeysTable)
      .where(eq(apiKeysTable.id, keyId));

    res.json({ success: true });
  } catch (error) {
    log(`Error deleting API key: ${error}`);
    res.status(500).json({ error: "Failed to delete API key" });
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

// Add subscription endpoint to show API key info
router.get("/subscription", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const [activeKey] = await db.select({
      key: apiKeysTable.key,
      expiresAt: apiKeysTable.expiresAt,
      active: apiKeysTable.active,
    })
    .from(apiKeysTable)
    .where(
      and(
        eq(apiKeysTable.userId, req.session.userId),
        eq(apiKeysTable.active, 1),
        gte(apiKeysTable.expiresAt, new Date())
      )
    )
    .orderBy(desc(apiKeysTable.expiresAt));

    if (!activeKey) {
      return res.json(null);
    }

    res.json({
      key: activeKey.key,
      expiresAt: activeKey.expiresAt,
      active: Boolean(activeKey.active)
    });
  } catch (error) {
    log(`Error fetching subscription info: ${error}`);
    res.status(500).json({ error: "Failed to fetch subscription information" });
  }
});

// Add delete user endpoint (admin only)
router.delete("/users/:id", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const isAdmin = await authService.isAdmin(req.session.userId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const userId = parseInt(req.params.id);

    // Don't allow deleting self
    if (userId === req.session.userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    await db.delete(usersTable)
      .where(eq(usersTable.id, userId));

    // Also delete associated API keys
    await db.delete(apiKeysTable)
      .where(eq(apiKeysTable.userId, userId));

    res.json({ success: true });
  } catch (error) {
    log(`Error deleting user: ${error}`);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Add API key to user account
router.post("/add-key", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { apiKey } = req.body;

    // Find the API key in database
    const [key] = await db.select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.key, apiKey))
      .execute();

    if (!key || key.userId !== null || key.active !== 1) {
      return res.status(400).json({
        error: "Invalid or already used API key"
      });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + key.durationDays);

    // Update API key with user ID and expiration
    await db.update(apiKeysTable)
      .set({
        userId: req.session.userId,
        expiresAt: expiresAt
      })
      .where(eq(apiKeysTable.id, key.id))
      .execute();

    log(`API key updated with user ID and expiration`);
    res.json({ success: true });
  } catch (error) {
    log(`Error adding API key: ${error}`);
    res.status(500).json({ error: "Failed to add API key" });
  }
});

export { router as authRouter };