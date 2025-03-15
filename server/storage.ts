import { type Product, type InsertProduct } from "@shared/schema";
import type { SearchParams } from "@shared/schema";

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
    
    return products.filter(product => {
      // Text search
      if (!product.title.toLowerCase().includes(params.query.toLowerCase())) {
        return false;
      }

      // Distance calculation using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (params.lat - product.latitude) * Math.PI / 180;
      const dLon = (params.lng - product.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(product.latitude * Math.PI / 180) * Math.cos(params.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance > params.radius) {
        return false;
      }

      // Marketplace filter
      if (params.marketplace && params.marketplace !== 'all' && 
          product.marketplace !== params.marketplace) {
        return false;
      }

      // Price filters
      if (params.minPrice && product.price < params.minPrice) {
        return false;
      }
      if (params.maxPrice && product.price > params.maxPrice) {
        return false;
      }

      return true;
    });
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }
}

export const storage = new MemStorage();
