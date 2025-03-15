import { type Product, type InsertProduct, type SearchParams } from "@shared/schema";
import { products, monitors, monitorProducts } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { marketplaceService } from "./services/marketplaces";

export interface IStorage {
  searchProducts(params: SearchParams): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createMonitor(params: SearchParams): Promise<{ id: number }>;
  getActiveMonitors(): Promise<{ id: number; params: SearchParams }[]>;
  getMonitorById(id: number): Promise<{ id: number; params: SearchParams } | undefined>;
  deactivateMonitor(id: number): Promise<void>;
  addProductToMonitor(monitorId: number, product: Product): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async searchProducts(params: SearchParams): Promise<Product[]> {
    try {
      const query = params.query || '';
      log(`Searching for products with query: ${query}`);

      // Get products from marketplaces
      const results = await Promise.allSettled([
        marketplaceService.searchOLX(query),
        marketplaceService.searchAllegro(query),
        marketplaceService.searchVinted(query)
      ]);

      // Combine successful results
      let allProducts: Product[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allProducts.push(...result.value);
        }
      });

      log(`Total products found: ${allProducts.length}`);

      // Apply filters
      let filteredProducts = allProducts;

      if (params.minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          product.price >= params.minPrice!
        );
      }

      if (params.maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          product.price <= params.maxPrice!
        );
      }

      if (params.marketplace && params.marketplace !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
          product.marketplace === params.marketplace
        );
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async createMonitor(params: SearchParams): Promise<{ id: number }> {
    const [monitor] = await db.insert(monitors).values({
      params: params,
      active: 1
    }).returning();

    return { id: monitor.id };
  }

  async getActiveMonitors(): Promise<{ id: number; params: SearchParams }[]> {
    return await db.select({
      id: monitors.id,
      params: monitors.params
    })
    .from(monitors)
    .where(eq(monitors.active, 1));
  }

  async getMonitorById(id: number): Promise<{ id: number; params: SearchParams } | undefined> {
    const [monitor] = await db.select({
      id: monitors.id,
      params: monitors.params
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
        .values(product)
        .returning();
      productId = newProduct.id;
    }

    await db.insert(monitorProducts).values({
      monitorId,
      productId
    });

    broadcastUpdate({
      type: 'new_monitored_products',
      products: [product],
      monitorId: monitorId.toString()
    });
  }
}

export const storage = new DatabaseStorage();