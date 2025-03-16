import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { searchParamsSchema } from "@shared/schema";
import { log } from "./vite";
import { monitoringService } from "./services/monitor";
import { authRouter } from "./routes/auth";

// Keep track of all connected clients
const clients = new Set<WebSocket>();

// Send ping to keep connections alive
function heartbeat(this: WebSocket) {
  this.isAlive = true;
}

// Broadcast updates to all connected clients
export function broadcastUpdate(data: unknown) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express) {
  // Register auth routes
  app.use("/api/auth", authRouter);

  app.get("/api/monitors", async (req, res) => {
    try {
      const monitors = await storage.getActiveMonitors();
      res.json(monitors);
    } catch (error) {
      log(`Error getting monitors: ${error}`);
      res.status(500).json({ error: "Failed to get monitors" });
    }
  });

  app.post("/api/products/search", async (req, res) => {
    try {
      log(`Search params received: ${JSON.stringify(req.body)}`);
      const params = searchParamsSchema.parse(req.body);
      const products = await storage.searchProducts(params);
      log(`Found ${products.length} products`);
      res.json(products);
    } catch (error) {
      log(`Search validation error: ${error}`);
      res.status(400).json({ error: "Invalid search parameters", details: String(error) });
    }
  });

  app.post("/api/monitor/start", async (req, res) => {
    try {
      const params = searchParamsSchema.parse(req.body);
      const result = await monitoringService.startMonitoring(params);
      res.json(result);
    } catch (error) {
      log(`Monitor start error: ${error}`);
      res.status(400).json({ error: "Invalid monitor parameters" });
    }
  });

  app.post("/api/monitor/stop", async (req, res) => {
    try {
      const { monitorId } = req.body;
      await monitoringService.stopMonitoring(monitorId);
      res.json({ success: true });
    } catch (error) {
      log(`Monitor stop error: ${error}`);
      res.status(400).json({ error: "Failed to stop monitor" });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Ping clients every 30 seconds to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean }) => {
    log('New WebSocket client connected');
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    clients.add(ws);

    ws.on('close', () => {
      log('Client disconnected');
      clients.delete(ws);
    });
  });

  wss.on('close', () => {
    clearInterval(interval);
  });

  return httpServer;
}