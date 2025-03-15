import axios from 'axios';
import { log } from "../vite";
import type { InsertProduct } from "@shared/schema";

export class MarketplaceService {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0'
  };

  private getDefaultImage(): string {
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }

  async searchOLX(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching OLX for: ${query}`);
      const response = await axios.get(`https://www.olx.pl/api/v1/offers/?offset=0&limit=40&query=${encodeURIComponent(query)}`, {
        headers: {
          ...this.headers,
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.olx.pl/',
          'Origin': 'https://www.olx.pl'
        }
      });

      log('OLX API response received');

      if (response.data && response.data.data) {
        return response.data.data.map((item: any) => {
          // Get the first photo URL or default image
          const photoUrl = item.photos && item.photos.length > 0 
            ? item.photos[0].link || this.getDefaultImage()
            : this.getDefaultImage();

          // Get price from params
          const priceParam = item.params?.find((p: any) => p.key === 'price');
          const price = priceParam?.value?.value 
            ? parseFloat(priceParam.value.value) 
            : 0;

          return {
            title: item.title,
            description: item.description || item.title,
            price,
            image: photoUrl,
            marketplace: 'olx',
            originalUrl: item.url,
            latitude: item.location?.lat || 52.2297,
            longitude: item.location?.lon || 21.0122
          };
        });
      }

      return [];
    } catch (error) {
      log(`Error fetching from OLX: ${error}`);
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching Allegro for: ${query}`);
      const response = await axios.get(`https://allegro.pl/listing/listing?string=${encodeURIComponent(query)}`, {
        headers: {
          ...this.headers,
          'Accept': 'application/vnd.allegro.public.v1+json',
          'Referer': 'https://allegro.pl/',
          'Origin': 'https://allegro.pl'
        }
      });

      log('Allegro API response received');

      if (response.data && response.data.items) {
        return response.data.items.map((item: any) => {
          // Get the first image URL or default image
          const imageUrl = item.images && item.images.length > 0 
            ? item.images[0].url || this.getDefaultImage()
            : this.getDefaultImage();

          return {
            title: item.name,
            description: item.name,
            price: parseFloat(item.sellingMode?.price?.amount || '0'),
            image: imageUrl,
            marketplace: 'allegro',
            originalUrl: item.url || `https://allegro.pl/oferta/${item.id}`,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      }

      return [];
    } catch (error) {
      log(`Error fetching from Allegro: ${error}`);
      return [];
    }
  }
}

export const marketplaceService = new MarketplaceService();