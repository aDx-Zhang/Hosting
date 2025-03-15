import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchParamsSchema } from "@shared/schema";
import { log } from "./vite";

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
  return httpServer;
}