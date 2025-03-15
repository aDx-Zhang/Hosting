import type { InsertProduct } from "@shared/schema";
import { storage } from "../../../server/storage";

const mockProducts: InsertProduct[] = [
  {
    title: "Premium Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 299.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    marketplace: "olx",
    originalUrl: "https://olx.pl/headphones",
    latitude: 52.2297,
    longitude: 21.0122
  },
  {
    title: "Smart Watch",
    description: "Latest model smart watch with fitness tracking",
    price: 199.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    marketplace: "allegro",
    originalUrl: "https://allegrolokalnie.pl/watch",
    latitude: 52.2297,
    longitude: 21.0122
  },
  {
    title: "Vintage Camera",
    description: "Classic analog camera in excellent condition",
    price: 150.00,
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
    marketplace: "vinted",
    originalUrl: "https://vinted.pl/camera",
    latitude: 52.2297,
    longitude: 21.0122
  }
  // Add more mock products here...
];

export async function initializeMockData() {
  for (const product of mockProducts) {
    await storage.createProduct(product);
  }
}
