import axios from 'axios';
import { log } from "../vite";
import type { InsertProduct } from "@shared/schema";

export class MarketplaceService {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
  };

  private getDefaultImage(): string {
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }

  private fixImageUrl(url: string): string {
    return url.replace('{width}x{height}', '400x300');
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
          let photoUrl = this.getDefaultImage();
          if (item.photos && item.photos.length > 0) {
            photoUrl = this.fixImageUrl(item.photos[0].link);
          }

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

  async searchVinted(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching Vinted for: ${query}`);
      const response = await axios.get(`https://www.vinted.pl/api/v1/catalog/items`, {
        params: {
          keyword: query,
          page: 1,
          per_page: 40
        },
        headers: {
          ...this.headers,
          'Accept': 'application/json',
          'Referer': 'https://www.vinted.pl/',
          'Origin': 'https://www.vinted.pl',
          'Auth': 'Bearer anonymous'
        }
      });

      log('Vinted API response:', response.data);

      if (response.data && response.data.items) {
        return response.data.items.map((item: any) => ({
          title: item.title,
          description: item.description || item.title,
          price: parseFloat(item.price) || 0,
          image: item.photo?.full_size_url || this.getDefaultImage(),
          marketplace: 'vinted',
          originalUrl: `https://www.vinted.pl/items/${item.id}`,
          latitude: 52.2297,
          longitude: 21.0122
        }));
      }

      return [];
    } catch (error) {
      log(`Error fetching from Vinted: ${error}`);
      if (axios.isAxiosError(error) && error.response) {
        log(`Vinted API error status: ${error.response.status}`);
        log(`Vinted API error data:`, error.response.data);
      }
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    return [];
  }
}

export const marketplaceService = new MarketplaceService();