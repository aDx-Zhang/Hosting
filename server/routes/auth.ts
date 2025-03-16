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

export { router as authRouter };