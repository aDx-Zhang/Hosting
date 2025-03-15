import axios from 'axios';
import { log } from "../vite";
import type { InsertProduct } from "@shared/schema";

export class MarketplaceService {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  async searchOLX(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching OLX for: ${query}`);
      const response = await axios.get(`https://m.olx.pl/oferty/q-${encodeURIComponent(query)}/`, {
        headers: this.headers
      });

      const html = response.data;
      // Extract product data from HTML using string operations
      const products: InsertProduct[] = [];
      const matches = html.match(/<div[^>]*class="css-[^"]*"[^>]*data-cy="l-card"[^>]*>[\s\S]*?<\/div>/g);

      if (matches) {
        matches.forEach((match: string) => {
          const titleMatch = match.match(/<h6[^>]*>([^<]+)<\/h6>/);
          const priceMatch = match.match(/data-testid="ad-price"[^>]*>([^<]+)<\/p>/);
          const imageMatch = match.match(/img[^>]+src="([^"]+)"/);
          const linkMatch = match.match(/href="([^"]+)"/);

          if (titleMatch && priceMatch) {
            const title = titleMatch[1].trim();
            const priceStr = priceMatch[1].trim();
            const numericPrice = parseFloat(priceStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            const image = imageMatch ? imageMatch[1] : '';
            const link = linkMatch ? linkMatch[1] : '';

            products.push({
              title,
              description: title,
              price: numericPrice,
              image,
              marketplace: 'olx',
              originalUrl: link.startsWith('http') ? link : `https://m.olx.pl${link}`,
              latitude: 52.2297,
              longitude: 21.0122
            });
          }
        });
      }

      log(`Found ${products.length} products from OLX`);
      return products;
    } catch (error) {
      log(`Error fetching from OLX: ${error}`);
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    try {
      log(`Searching Allegro for: ${query}`);
      const response = await axios.get(`https://allegro.pl.allegrosandbox.pl/listing?string=${encodeURIComponent(query)}`, {
        headers: this.headers
      });

      const html = response.data;
      const products: InsertProduct[] = [];
      const matches = html.match(/<article[^>]*class="[^"]*_9c44d_3pyzl"[^>]*>[\s\S]*?<\/article>/g);

      if (matches) {
        matches.forEach((match: string) => {
          const titleMatch = match.match(/<h2[^>]*>([^<]+)<\/h2>/);
          const priceMatch = match.match(/data-price="([^"]+)"/);
          const imageMatch = match.match(/img[^>]+src="([^"]+)"/);
          const linkMatch = match.match(/href="([^"]+)"/);

          if (titleMatch && priceMatch) {
            const title = titleMatch[1].trim();
            const numericPrice = parseFloat(priceMatch[1]) || 0;
            const image = imageMatch ? imageMatch[1] : '';
            const link = linkMatch ? linkMatch[1] : '';

            products.push({
              title,
              description: title,
              price: numericPrice,
              image,
              marketplace: 'allegro',
              originalUrl: link,
              latitude: 52.2297,
              longitude: 21.0122
            });
          }
        });
      }

      log(`Found ${products.length} products from Allegro`);
      return products;
    } catch (error) {
      log(`Error fetching from Allegro: ${error}`);
      return [];
    }
  }
}

export const marketplaceService = new MarketplaceService();