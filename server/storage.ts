import { type Product, type InsertProduct, type SearchParams, type MonitorProduct, type User } from "@shared/schema";
import { products, monitors, monitorProducts, apiKeys, users } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { db } from "./db";
import { eq, and, desc, gte } from "drizzle-orm";

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
  getUserById(id: number): Promise<User | undefined>;
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
          // Set foundAt to current time for each new product
          const foundAt = new Date();
          const products = result.value.map(product => ({
            ...product,
            price: product.price.toString(),
            foundAt // Add foundAt timestamp for each product
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
          log(`Stored product with foundAt: ${product.foundAt}`);
        } catch (error) {
          log(`Error storing product: ${error}`);
        }
      }

      if (monitorCreatedAt) {
        log(`Filtering products found after monitor creation: ${monitorCreatedAt}`);
        // Only return products found after monitor creation
        const newProducts = filteredProducts.filter(product =>
          product.foundAt > monitorCreatedAt
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
    try {
      log(`Creating product: ${product.title}`);
      const [newProduct] = await db.insert(products)
        .values({
          title: product.title,
          description: product.description,
          price: product.price,
          image: product.image,
          marketplace: product.marketplace,
          originalUrl: product.originalUrl,
          foundAt: product.foundAt || new Date()
        })
        .returning();

      log(`Created product with ID: ${newProduct.id}`);
      return newProduct;
    } catch (error) {
      log(`Error creating product: ${error}`);
      throw error;
    }
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
    try {
      // Get monitor's creation time to filter old products
      const monitor = await this.getMonitorById(monitorId);
      if (!monitor) {
        log(`Monitor ${monitorId} not found`);
        return;
      }

      log(`Adding product ${product.id} (${product.title}) to monitor ${monitorId}`);

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
          });

        log(`Successfully linked product ${product.id} to monitor ${monitorId}`);

        // Broadcast the new product
        broadcastUpdate({
          type: 'new_monitored_products',
          products: [product],
          monitorId: monitorId.toString()
        });
      } else {
        log(`Product ${product.id} already linked to monitor ${monitorId}`);
      }
    } catch (error) {
      log(`Error adding product to monitor: ${error}`);
      throw error;
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
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const now = new Date();

    try {
      // First validate if key exists
      const [keyToActivate] = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.key, key))
        .limit(1);

      if (!keyToActivate) {
        throw new Error('Invalid API key');
      }

      // Find current active subscription if exists
      const [currentSubscription] = await db.select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, userId),
            eq(apiKeys.active, 1),
            gte(apiKeys.expiresAt, now)
          )
        )
        .orderBy(desc(apiKeys.expiresAt))
        .limit(1);

      // Calculate new expiry date
      let expiryDate: Date;

      if (currentSubscription?.expiresAt) {
        // If there's an active subscription, extend from its expiry date
        expiryDate = new Date(currentSubscription.expiresAt.getTime() + (durationDays * millisecondsPerDay));
        log(`Extending from existing subscription that expires at ${currentSubscription.expiresAt}`);
      } else {
        // Otherwise start from now
        expiryDate = new Date(now.getTime() + (durationDays * millisecondsPerDay));
        log(`Starting new subscription from current time`);
      }

      log(`Setting expiry date to: ${expiryDate.toISOString()}`);

      // Update the key with user and new expiry
      await db.update(apiKeys)
        .set({
          userId,
          expiresAt: expiryDate,
          durationDays,
          active: 1
        })
        .where(eq(apiKeys.key, key));

      log(`Successfully activated key ${key} for user ${userId}`);
    } catch (error) {
      log(`Error in addApiKey: ${error}`);
      throw new Error('Failed to add API key');
    }
  }
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
}

export const storage = new DatabaseStorage();