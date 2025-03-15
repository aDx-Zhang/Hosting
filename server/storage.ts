import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";
import { broadcastUpdate } from "./routes";
import { log } from "./vite";
import { mockProducts } from "../client/src/lib/mock-data";

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

    // Initialize with mock data
    mockProducts.forEach(product => {
      const id = this.currentId++;
      this.products.set(id, { ...product, id });
    });
  }

  async searchProducts(params: SearchParams): Promise<Product[]> {
    try {
      let filteredProducts = Array.from(this.products.values());

      // Apply filters
      if (params.query) {
        const searchQuery = params.query.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
          product.title.toLowerCase().includes(searchQuery) ||
          product.description.toLowerCase().includes(searchQuery)
        );
      }

      // Price filters
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

      // Marketplace filter
      if (params.marketplace && params.marketplace !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
          product.marketplace === params.marketplace
        );
      }

      log(`Found ${filteredProducts.length} products matching criteria`);
      return filteredProducts;
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