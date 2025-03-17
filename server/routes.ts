import { Router } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import type { Express } from "express";
import { storage } from "./storage";
import { searchParamsSchema, insertProductSchema } from "@shared/schema";
import { log } from "./vite";
import { monitoringService } from "./services/monitor";
import { authRouter } from "./routes/auth";

function heartbeat(this: WebSocket & { isAlive?: boolean }) {
  this.isAlive = true;
}

let wss: WebSocketServer;

export function broadcastUpdate(data: unknown) {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);

  app.get("/api/monitors", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const monitors = await storage.getActiveMonitors(req.session.userId);
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

  // New endpoint for creating test products
  app.post("/api/products/test", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Parse and create the product
      const productData = insertProductSchema.parse(req.body);
      log(`Creating test product: ${productData.title}`);

      const createdProduct = await storage.createProduct(productData);
      log(`Successfully created test product with ID: ${createdProduct.id}`);

      // Get all active monitors to broadcast the new product
      const monitors = await storage.getActiveMonitors(req.session.userId);
      log(`Found ${monitors.length} active monitors to update`);

      // Add product to each monitor
      for (const monitor of monitors) {
        try {
          await storage.addProductToMonitor(monitor.id, createdProduct);
          log(`Added product to monitor ${monitor.id}`);
        } catch (error) {
          log(`Error adding product to monitor ${monitor.id}: ${error}`);
        }
      }

      res.json(createdProduct);
    } catch (error) {
      log(`Error creating test product: ${error}`);
      res.status(400).json({ error: "Failed to create test product" });
    }
  });

  app.post("/api/monitor/start", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const params = searchParamsSchema.parse(req.body);
      const result = await monitoringService.startMonitoring(params, req.session.userId);
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

  // Basic WebSocket server configuration
  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

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