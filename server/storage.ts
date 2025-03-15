import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { allegroAPI } from "./services/allegro";
import { olxAPI } from "./services/olx";

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
      const results = await Promise.allSettled([
        allegroAPI.searchProducts(params.query),
        olxAPI.searchProducts(params.query)
      ]);

      let allProducts: Product[] = [];

      // Process Allegro results
      if (results[0].status === 'fulfilled') {
        allProducts = [...allProducts, ...results[0].value];
        log(`Found ${results[0].value.length} products from Allegro`);
      } else {
        log(`Error fetching from Allegro: ${results[0].reason}`);
      }

      // Process OLX results
      if (results[1].status === 'fulfilled') {
        allProducts = [...allProducts, ...results[1].value];
        log(`Found ${results[1].value.length} products from OLX`);
      } else {
        log(`Error fetching from OLX: ${results[1].reason}`);
      }

      // Add local products
      const localProducts = Array.from(this.products.values());
      allProducts = [...allProducts, ...localProducts];
      log(`Found ${localProducts.length} products from local storage`);

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
      // Return empty array instead of throwing to handle errors gracefully
      return [];
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