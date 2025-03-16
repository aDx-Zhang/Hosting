import { Router } from "express";
import { authService } from "../services/auth";
import { loginSchema, registerSchema, apiKeySchema } from "@shared/schema";
import { log } from "../vite";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router = Router();

// Login endpoint with enhanced error handling
router.post("/login", async (req, res) => {
  try {
    log('Login attempt received');
    const { username, password } = loginSchema.parse(req.body);
    log(`Attempting to validate user: ${username}`);

    const user = await authService.validateUser(username, password);

    if (!user) {
      log(`Login failed for user: ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    log(`Login successful for user: ${username}`);

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
    res.status(400).json({ error: "Invalid login data" });
  }
});

// Register new user (admin only)
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = registerSchema.parse(req.body);

    // Only allow admin to register new users
    const userId = req.session.userId;
    if (!userId || !await authService.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can register new users" });
    }

    const user = await authService.createUser(username, password, role);
    res.json({ success: true, userId: user.id });
  } catch (error) {
    log(`Registration error: ${error}`);
    res.status(400).json({ error: "Invalid registration data" });
  }
});

// Check session status
router.get("/session", (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true });
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

// Generate API key (admin only)
router.post("/api-keys", async (req, res) => {
  try {
    const { userId, durationDays } = apiKeySchema.parse(req.body);

    // Verify admin permission
    const adminId = req.session.userId;
    if (!adminId || !await authService.isAdmin(adminId)) {
      return res.status(403).json({ error: "Only admins can generate API keys" });
    }

    const key = await authService.generateApiKey(userId, durationDays);
    res.json({ success: true, key });
  } catch (error) {
    log(`API key generation error: ${error}`);
    res.status(400).json({ error: "Failed to generate API key" });
  }
});

// List API keys (admin only)
router.get("/api-keys", async (req, res) => {
  try {
    const adminId = req.session.userId;
    if (!adminId || !await authService.isAdmin(adminId)) {
      return res.status(403).json({ error: "Only admins can list API keys" });
    }

    const keys = await authService.listApiKeys(adminId);
    res.json(keys);
  } catch (error) {
    log(`API key listing error: ${error}`);
    res.status(400).json({ error: "Failed to list API keys" });
  }
});

// Deactivate API key (admin only)
router.post("/api-keys/:id/deactivate", async (req, res) => {
  try {
    const keyId = parseInt(req.params.id);
    const adminId = req.session.userId;

    if (!adminId || !await authService.isAdmin(adminId)) {
      return res.status(403).json({ error: "Only admins can deactivate API keys" });
    }

    await authService.deactivateApiKey(adminId, keyId);
    res.json({ success: true });
  } catch (error) {
    log(`API key deactivation error: ${error}`);
    res.status(400).json({ error: "Failed to deactivate API key" });
  }
});

export { router as authRouter };