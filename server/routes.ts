import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { searchParamsSchema } from "@shared/schema";
import { log } from "./vite";

// Keep track of all connected clients
const clients = new Set<WebSocket>();

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
  app.post("/api/products/search", async (req, res) => {
    try {
      log(`Search params received: ${JSON.stringify(req.body)}`);
      const params = searchParamsSchema.parse(req.body);
      const products = await storage.searchProducts(params);
      res.json(products);
    } catch (error) {
      log(`Search validation error: ${error}`);
      res.status(400).json({ error: "Invalid search parameters", details: String(error) });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const product = await storage.getProduct(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    log('New WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
      log('Client disconnected');
      clients.delete(ws);
    });
  });

  return httpServer;
}