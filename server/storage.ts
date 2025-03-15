import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { webScraper } from "./services/scraper";

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
        webScraper.searchOLX(params.query),
        webScraper.searchAllegro(params.query)
      ]);

      let allProducts: Product[] = [];

      // Process OLX results
      if (results[0].status === 'fulfilled') {
        const olxProducts = results[0].value.map(p => ({
          ...p,
          id: this.currentId++
        }));
        allProducts = [...allProducts, ...olxProducts];
        log(`Found ${olxProducts.length} products from OLX`);
      } else {
        log(`Error fetching from OLX: ${results[0].reason}`);
      }

      // Process Allegro results
      if (results[1].status === 'fulfilled') {
        const allegroProducts = results[1].value.map(p => ({
          ...p,
          id: this.currentId++
        }));
        allProducts = [...allProducts, ...allegroProducts];
        log(`Found ${allegroProducts.length} products from Allegro`);
      } else {
        log(`Error fetching from Allegro: ${results[1].reason}`);
      }

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

    broadcastUpdate({
      type: 'new_product',
      product: newProduct
    });

    return newProduct;
  }
}

export const storage = new MemStorage();