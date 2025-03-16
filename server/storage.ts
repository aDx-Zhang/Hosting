import { type Product, type InsertProduct, type SearchParams, type MonitorProduct } from "@shared/schema";
import { products, monitors, monitorProducts, apiKeys } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { db } from "./db";
import { eq, and, desc, gte } from "drizzle-orm";
import { marketplaceService } from "./services/marketplaces";

export interface IStorage {
  searchProducts(params: SearchParams): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createMonitor(params: SearchParams, userId: number): Promise<{ id: number }>;
  getActiveMonitors(userId: number): Promise<{ id: number; params: SearchParams; createdAt: Date }[]>;
  getMonitorById(id: number): Promise<{ id: number; params: SearchParams; createdAt: Date } | undefined>;
  deactivateMonitor(id: number): Promise<void>;
  addProductToMonitor(monitorId: number, product: Product): Promise<void>;
  getUserSubscriptionInfo(userId: number): Promise<{ expiresAt: Date; active: boolean } | null>;
}

export class DatabaseStorage implements IStorage {
  async searchProducts(params: SearchParams): Promise<Product[]> {
    try {
      const query = params.query || '';
      log(`Searching for products with query: ${query}`);

      const results = await Promise.allSettled([
        marketplaceService.searchOLX(query),
        marketplaceService.searchAllegro(query),
        marketplaceService.searchVinted(query)
      ]);

      let allProducts: Product[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          // Ensure prices are converted to strings for database storage
          const products = result.value.map(product => ({
            ...product,
            price: product.price.toString()
          }));
          allProducts.push(...products);
        }
      });

      log(`Total products found: ${allProducts.length}`);

      let filteredProducts = allProducts;

      if (params.minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(product => {
          const price = parseFloat(product.price);
          log(`Checking price ${price} >= ${params.minPrice}`);
          return price >= params.minPrice!;
        });
      }

      if (params.maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(product => {
          const price = parseFloat(product.price);
          log(`Checking price ${price} <= ${params.maxPrice}`);
          return price <= params.maxPrice!;
        });
      }

      if (params.marketplace && params.marketplace !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
          product.marketplace === params.marketplace
        );
      }

      // Store filtered products in database
      for (const product of filteredProducts) {
        try {
          await this.createProduct(product);
        } catch (error) {
          log(`Error storing product: ${error}`);
        }
      }

      log(`Found ${filteredProducts.length} products after applying filters`);
      return filteredProducts;
    } catch (error) {
      log(`Error searching products: ${error}`);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products)
      .values({
        ...product,
        // Convert string price to numeric for database storage
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        foundAt: new Date()
      })
      .returning();
    return newProduct;
  }

  async createMonitor(params: SearchParams, userId: number): Promise<{ id: number }> {
    const [monitor] = await db.insert(monitors).values({
      params: params,
      active: 1,
      userId,
      createdAt: new Date()
    }).returning();

    return { id: monitor.id };
  }

  async getActiveMonitors(userId: number): Promise<{ id: number; params: SearchParams; createdAt: Date }[]> {
    return await db.select({
      id: monitors.id,
      params: monitors.params,
      createdAt: monitors.createdAt
    })
    .from(monitors)
    .where(
      and(
        eq(monitors.active, 1),
        eq(monitors.userId, userId)
      )
    );
  }

  async getMonitorById(id: number): Promise<{ id: number; params: SearchParams; createdAt: Date } | undefined> {
    const [monitor] = await db.select({
      id: monitors.id,
      params: monitors.params,
      createdAt: monitors.createdAt
    })
    .from(monitors)
    .where(eq(monitors.id, id));

    return monitor;
  }

  async deactivateMonitor(id: number): Promise<void> {
    await db.update(monitors)
      .set({ active: 0 })
      .where(eq(monitors.id, id));
  }

  async addProductToMonitor(monitorId: number, product: Product): Promise<void> {
    // First check if this product is already in the database
    const [existingProduct] = await db.select()
      .from(products)
      .where(
        and(
          eq(products.originalUrl, product.originalUrl),
          eq(products.marketplace, product.marketplace)
        )
      );

    let productId: number;

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const [newProduct] = await db.insert(products)
        .values({
          ...product,
          foundAt: new Date()
        })
        .returning();
      productId = newProduct.id;
    }

    // Check if this product is already linked to this monitor
    const [existingMonitorProduct] = await db.select()
      .from(monitorProducts)
      .where(
        and(
          eq(monitorProducts.monitorId, monitorId),
          eq(monitorProducts.productId, productId)
        )
      );

    // Only add to monitor and broadcast if it's a new product for this monitor
    if (!existingMonitorProduct) {
      await db.insert(monitorProducts)
        .values({
          monitorId,
          productId,
          createdAt: new Date()
        })
        .returning();

      broadcastUpdate({
        type: 'new_monitored_products',
        products: [product],
        monitorId: monitorId.toString()
      });
    }
  }

  async getUserSubscriptionInfo(userId: number): Promise<{ expiresAt: Date; active: boolean } | null> {
    const [activeKey] = await db.select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, userId),
          eq(apiKeys.active, 1),
          gte(apiKeys.expiresAt, new Date())
        )
      )
      .orderBy(desc(apiKeys.expiresAt));

    if (!activeKey?.expiresAt) return null;

    return {
      expiresAt: activeKey.expiresAt,
      active: true
    };
  }
}

export const storage = new DatabaseStorage();