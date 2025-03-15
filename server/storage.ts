import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";

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
    const products = Array.from(this.products.values());
    log(`Total products in storage: ${products.length}`);

    return products.filter(product => {
      // If no query or empty query, include the product
      if (!params.query) {
        return true;
      }

      // Text search in title and description
      const searchQuery = params.query.toLowerCase();
      const titleMatch = product.title.toLowerCase().includes(searchQuery);
      const descriptionMatch = product.description.toLowerCase().includes(searchQuery);

      // Price filters
      const priceInRange = 
        (!params.minPrice || product.price >= params.minPrice) &&
        (!params.maxPrice || product.price <= params.maxPrice);

      // Marketplace filter
      const marketplaceMatch = 
        !params.marketplace || 
        params.marketplace === 'all' || 
        product.marketplace === params.marketplace;

      return (titleMatch || descriptionMatch) && priceInRange && marketplaceMatch;
    });
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