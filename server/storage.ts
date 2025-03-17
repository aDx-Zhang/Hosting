import { type Product, type InsertProduct, type SearchParams, type MonitorProduct } from "@shared/schema";
import { products, monitors, monitorProducts, apiKeys } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { db } from "./db";
import { eq, and, desc, gte } from "drizzle-orm";
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
      .orderBy(desc(apiKeys.expiresAt))
      .limit(1);

    if (!activeKey?.expiresAt) return null;

    return {
      expiresAt: activeKey.expiresAt,
      active: true
    };
  }

  async addApiKey(key: string, userId: number, durationDays: number): Promise<void> {
    const now = new Date();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    log(`Starting addApiKey process for user ${userId} with ${durationDays} days duration`);

    try {
      // Step 1: First deactivate all currently active keys for this user
      const deactivateResult = await db.execute(
        `UPDATE api_keys SET active = 0 WHERE user_id = $1 AND active = 1 RETURNING id`,
        [userId]
      );

      const deactivatedCount = deactivateResult.rows?.length || 0;
      log(`Deactivated ${deactivatedCount} existing keys`);

      // Step 2: Find the latest expiring key to calculate total duration
      const [latestKey] = await db.select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, userId),
            gte(apiKeys.expiresAt, now)
          )
        )
        .orderBy(desc(apiKeys.expiresAt))
        .limit(1);

      // Calculate total duration and expiry date
      let totalDays = durationDays;
      let expiryDate = new Date(now.getTime() + (durationDays * millisecondsPerDay));

      if (latestKey) {
        // Calculate remaining time from latest key
        const remainingMs = latestKey.expiresAt.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMs / millisecondsPerDay);
        totalDays = remainingDays + durationDays;

        // Add new duration to latest key's expiry
        expiryDate = new Date(latestKey.expiresAt.getTime() + (durationDays * millisecondsPerDay));

        log(`Found latest key with expiry: ${latestKey.expiresAt.toISOString()}`);
        log(`Current remaining days: ${remainingDays}`);
        log(`Adding ${durationDays} days for total of ${totalDays} days`);
      }

      log(`Setting expiry to: ${expiryDate.toISOString()}`);

      // Step 3: Create new key with total duration
      const [newKey] = await db.insert(apiKeys)
        .values({
          key,
          userId,
          expiresAt: expiryDate,
          active: 1,
          durationDays: totalDays,
          createdAt: now
        })
        .returning();

      log(`Created new key ${newKey.id} with ${totalDays} days duration`);

      // Step 4: Verify the results
      const verification = await db.execute(
        `SELECT COUNT(*) as active_count FROM api_keys WHERE user_id = $1 AND active = 1`,
        [userId]
      );

      const activeCount = parseInt(verification.rows?.[0]?.active_count || '0');
      if (activeCount !== 1) {
        throw new Error(`Verification failed: Found ${activeCount} active keys instead of 1`);
      }

      log(`Successfully created new key with ${totalDays} days duration`);
    } catch (error) {
      log(`Error in addApiKey: ${error}`);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();