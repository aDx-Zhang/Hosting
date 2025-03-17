import { type Product, type InsertProduct, type SearchParams, type MonitorProduct } from "@shared/schema";
import { products, monitors, monitorProducts, apiKeys } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { db } from "./db";
import { eq, and, desc, gte, gt } from "drizzle-orm";
import { marketplaceService } from "./services/marketplaces";

export interface IStorage {
  searchProducts(params: SearchParams, monitorCreatedAt?: Date): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createMonitor(params: SearchParams, userId: number): Promise<{ id: number }>;
  getActiveMonitors(userId: number): Promise<{ id: number; params: SearchParams; createdAt: Date }[]>;
  getMonitorById(id: number): Promise<{ id: number; params: SearchParams; createdAt: Date } | undefined>;
  deactivateMonitor(id: number): Promise<void>;
  addProductToMonitor(monitorId: number, product: Product): Promise<void>;
  getUserSubscriptionInfo(userId: number): Promise<{ expiresAt: Date; active: boolean } | null>;
  addApiKey(key: string, userId: number, durationDays: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async searchProducts(params: SearchParams, monitorCreatedAt?: Date): Promise<Product[]> {
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
            price: product.price.toString(),
            foundAt: new Date() // Set foundAt to current time for new products
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

      // Store filtered products but only return ones found after monitor creation
      for (const product of filteredProducts) {
        try {
          await this.createProduct(product);
        } catch (error) {
          log(`Error storing product: ${error}`);
        }
      }

      if (monitorCreatedAt) {
        log(`Filtering products found after monitor creation: ${monitorCreatedAt}`);
        // Only return products found after monitor creation
        const newProducts = filteredProducts.filter(product =>
          new Date(product.foundAt) > monitorCreatedAt
        );
        log(`Found ${newProducts.length} new products after monitor creation`);
        return newProducts;
      }

      return [];
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
        foundAt: product.foundAt || new Date()
      })
      .returning();
    return newProduct;
  }

  async createMonitor(params: SearchParams, userId: number): Promise<{ id: number }> {
    const now = new Date();
    const [monitor] = await db.insert(monitors).values({
      params: params,
      active: 1,
      userId,
      createdAt: now,
      lastCheckedAt: now,
      updateFrequency: params.updateFrequency
    }).returning();

    return { id: monitor.id };
  }

  async getActiveMonitors(userId: number): Promise<{ id: number; params: SearchParams; createdAt: Date }[]> {
    const activeMonitors = await db.select({
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

    return activeMonitors;
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
    // Get monitor's creation time to filter old products
    const monitor = await this.getMonitorById(monitorId);
    if (!monitor) return;

    log(`Adding product ${product.title} to monitor ${monitorId}, monitor created at ${monitor.createdAt}`);

    // Skip if product was found before monitor creation
    if (new Date(product.foundAt) <= monitor.createdAt) {
      log(`Skipping old product found before monitor creation: ${product.title}`);
      return;
    }

    // Check if this product is already linked to this monitor
    const [existingMonitorProduct] = await db.select()
      .from(monitorProducts)
      .where(
        and(
          eq(monitorProducts.monitorId, monitorId),
          eq(monitorProducts.productId, product.id)
        )
      );

    // Only add to monitor and broadcast if it's a new product for this monitor
    if (!existingMonitorProduct) {
      await db.insert(monitorProducts)
        .values({
          monitorId,
          productId: product.id,
          createdAt: new Date()
        })
        .returning();

      log(`Broadcasting new product: ${product.title} for monitor ${monitorId}`);
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

  async addApiKey(key: string, userId: number, durationDays: number): Promise<void> {
    const now = new Date();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    log(`Adding API key for user ${userId} with duration ${durationDays} days`);

    // Find existing active key
    const [existingKey] = await db.select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.userId, userId),
          eq(apiKeys.active, 1),
          gte(apiKeys.expiresAt, now)
        )
      );

    if (existingKey) {
      log(`Found existing key: ID=${existingKey.id}, current expiry=${existingKey.expiresAt.toISOString()}`);

      // Calculate duration in milliseconds
      const additionalMs = durationDays * millisecondsPerDay;

      // Calculate new expiry by adding milliseconds to existing expiry
      const newExpiryDate = new Date(existingKey.expiresAt.getTime() + additionalMs);

      log(`Current expiry timestamp: ${existingKey.expiresAt.getTime()}`);
      log(`Additional milliseconds: ${additionalMs}`);
      log(`New expiry timestamp: ${newExpiryDate.getTime()}`);
      log(`New expiry date: ${newExpiryDate.toISOString()}`);

      await db.update(apiKeys)
        .set({
          expiresAt: newExpiryDate,
          durationDays: existingKey.durationDays + durationDays
        })
        .where(eq(apiKeys.id, existingKey.id));

      // Verify the update
      const [updatedKey] = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.id, existingKey.id));

      log(`Updated key expiry to: ${updatedKey.expiresAt.toISOString()}`);
      log(`Total duration is now: ${updatedKey.durationDays} days`);

    } else {
      log(`No existing active key found, creating new one`);

      const durationMs = durationDays * millisecondsPerDay;
      const expiryDate = new Date(now.getTime() + durationMs);

      log(`Setting initial expiry to: ${expiryDate.toISOString()}`);

      await db.insert(apiKeys)
        .values({
          key,
          userId,
          expiresAt: expiryDate,
          active: 1,
          durationDays,
          createdAt: now
        });
    }
  }
}

export const storage = new DatabaseStorage();