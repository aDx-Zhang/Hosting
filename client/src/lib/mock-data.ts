import type { InsertProduct } from "@shared/schema";
import { storage } from "../../../server/storage";

export const mockProducts: InsertProduct[] = [
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
    latitude: 52.2350,
    longitude: 21.0200
  },
  {
    title: "Vintage Camera",
    description: "Classic analog camera in excellent condition",
    price: 150.00,
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
    marketplace: "vinted",
    originalUrl: "https://vinted.pl/camera",
    latitude: 52.2200,
    longitude: 21.0050
  },
  {
    title: "Gaming Laptop",
    description: "Powerful gaming laptop with RTX graphics",
    price: 3999.99,
    image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2",
    marketplace: "olx",
    originalUrl: "https://olx.pl/laptop",
    latitude: 52.2400,
    longitude: 21.0150
  },
  {
    title: "Mountain Bike",
    description: "Professional mountain bike, perfect condition",
    price: 899.99,
    image: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91",
    marketplace: "allegro",
    originalUrl: "https://allegrolokalnie.pl/bike",
    latitude: 52.2150,
    longitude: 21.0300
  }
];

export async function initializeMockData() {
  try {
    for (const product of mockProducts) {
      await storage.createProduct(product);
    }
    console.log('Mock data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize mock data:', error);
  }
}