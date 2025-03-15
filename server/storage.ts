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
      const query = params.query || '';
      log(`Searching for products with query: ${query}`);

      // Get products from both marketplaces
      const [olxProducts, allegroProducts] = await Promise.all([
        webScraper.searchOLX(query),
        webScraper.searchAllegro(query)
      ]);

      // Combine and assign IDs to products
      let allProducts: Product[] = [];

      olxProducts.forEach(product => {
        const id = this.currentId++;
        allProducts.push({ ...product, id });
      });

      allegroProducts.forEach(product => {
        const id = this.currentId++;
        allProducts.push({ ...product, id });
      });

      log(`Total products found: ${allProducts.length}`);

      // Apply filters
      let filteredProducts = allProducts;

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

      log(`Found ${filteredProducts.length} products after applying filters`);
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