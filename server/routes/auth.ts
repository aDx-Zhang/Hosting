import { Router } from "express";
import { authService } from "../services/auth";
import { loginSchema } from "@shared/schema";
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