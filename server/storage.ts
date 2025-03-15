import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { allegroAPI } from "./services/allegro";

export interface IStorage {
  searchProducts(params: SearchParams): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private currentId: number;

  constructor() {
    this.products = new Map();
    this.currentId = 1;
  }

  async searchProducts(params: SearchParams): Promise<Product[]> {
    try {
      // Get real Allegro products
      const allegroProducts = await allegroAPI.searchProducts(params.query);
      log(`Found ${allegroProducts.length} products from Allegro`);

      // Combine with local products (if any)
      const localProducts = Array.from(this.products.values());
      log(`Found ${localProducts.length} products from local storage`);

      const allProducts = [...allegroProducts, ...localProducts];

      return allProducts.filter(product => {
        // Price filters
        const priceInRange = 
          (!params.minPrice || product.price >= params.minPrice) &&
          (!params.maxPrice || product.price <= params.maxPrice);

        // Marketplace filter
        const marketplaceMatch = 
          !params.marketplace || 
          params.marketplace === 'all' || 
          product.marketplace === params.marketplace;

        return priceInRange && marketplaceMatch;
      });
    } catch (error) {
      log(`Error searching products: ${error}`);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct = { ...product, id };
    this.products.set(id, newProduct);

    log(`Created new product: ${JSON.stringify(newProduct)}`);

    // Broadcast the new product to all connected clients
    broadcastUpdate({
      type: 'new_product',
      product: newProduct
    });

    return newProduct;
  }
}

export const storage = new MemStorage();