import { Router } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import type { Express } from "express";
import { storage } from "./storage";
import { searchParamsSchema } from "@shared/schema";
import { log } from "./vite";
import { monitoringService } from "./services/monitor";
import { authRouter } from "./routes/auth";

function heartbeat(this: WebSocket & { isAlive?: boolean }) {
  this.isAlive = true;
}

let wss: WebSocketServer;

export function broadcastUpdate(data: unknown) {
  if (!wss) {
    log('WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify(data);
  log(`Broadcasting message: ${message}`);

  let clientCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });

  log(`Message broadcasted to ${clientCount} clients`);
}

export async function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);

  app.get("/api/monitors", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const monitors = await storage.getActiveMonitors(req.session.userId);
      log(`Retrieved ${monitors.length} active monitors for user ${req.session.userId}`);
      res.json(monitors);
    } catch (error) {
      log(`Error getting monitors: ${error}`);
      res.status(500).json({ error: "Failed to get monitors" });
    }
  });

  app.post("/api/products/search", async (req, res) => {
    try {
      const params = searchParamsSchema.parse(req.body);
      const products = await storage.searchProducts(params);
      res.json(products);
    } catch (error) {
      log(`Search validation error: ${error}`);
      res.status(400).json({ error: "Invalid search parameters" });
    }
  });

  app.post("/api/monitor/start", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const params = searchParamsSchema.parse(req.body);
      log(`Starting monitor for user ${req.session.userId} with params:`, params);

      const result = await monitoringService.startMonitoring(params, req.session.userId);
      log(`Monitor started successfully with ID: ${result.id}`);

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

  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  log('WebSocket server initialized');

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean }) => {
    log('New WebSocket client connected');
    ws.isAlive = true;

    ws.on('pong', heartbeat);

    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Connected to real-time updates'
    }));

    ws.on('error', (error) => {
      log(`WebSocket error: ${error}`);
    });

    ws.on('close', () => {
      log('Client disconnected');
    });
  });

  wss.on('close', () => {
    clearInterval(interval);
  });

  return httpServer;
}