import axios from 'axios';
import { log } from "../vite";
import type { InsertProduct } from "@shared/schema";

export class MarketplaceService {
  async searchOLX(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching OLX for: ${query}`);
      const response = await axios.get(`https://www.olx.pl/api/v1/offers?query=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      return response.data.data.map((item: any) => ({
        title: item.title,
        description: item.description || '',
        price: parseFloat(item.price.value),
        image: item.photos?.[0]?.url || '',
        marketplace: 'olx',
        originalUrl: item.url,
        latitude: item.location?.lat || 52.2297,
        longitude: item.location?.lon || 21.0122
      }));
    } catch (error) {
      log(`Error fetching from OLX: ${error}`);
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching Allegro for: ${query}`);
      const response = await axios.get(`https://allegro.pl.cdn.allegro.pl/listing/listing/search?string=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      return response.data.items.map((item: any) => ({
        title: item.name,
        description: item.name,
        price: parseFloat(item.price.amount),
        image: item.image?.url || '',
        marketplace: 'allegro',
        originalUrl: `https://allegro.pl/oferta/${item.id}`,
        latitude: 52.2297,
        longitude: 21.0122
      }));
    } catch (error) {
      log(`Error fetching from Allegro: ${error}`);
      return [];
    }
  }
}

export const marketplaceService = new MarketplaceService();
