import axios from 'axios';
import { load } from 'cheerio';
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
      const response = await axios.get(`https://m.vinted.pl/catalog?search_text=${encodeURIComponent(query)}`, {
        headers: {
          ...this.headers,
          'Accept': 'text/html',
          'Referer': 'https://m.vinted.pl',
          'Origin': 'https://m.vinted.pl'
        }
      });

      const $ = load(response.data);
      const products: InsertProduct[] = [];

      $('.feed-grid__item').each((_, element) => {
        const $item = $(element);
        const title = $item.find('.ItemBox_title__OaKlq').text().trim();
        const priceText = $item.find('.ItemBox_price__K3ZM3').text().trim();
        const imageUrl = $item.find('img').attr('src') || this.getDefaultImage();
        const itemUrl = $item.find('a').attr('href') || '';

        const priceMatch = priceText.match(/\d+([.,]\d+)?/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

        if (title && price) {
          products.push({
            title,
            description: title,
            price,
            image: imageUrl,
            marketplace: 'vinted',
            originalUrl: itemUrl.startsWith('http') ? itemUrl : `https://www.vinted.pl${itemUrl}`,
            latitude: 52.2297,
            longitude: 21.0122
          });
        }
      });

      log(`Found ${products.length} products from Vinted`);
      return products;

    } catch (error) {
      log(`Error fetching from Vinted: ${error}`);
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    return [];
  }
}

export const marketplaceService = new MarketplaceService();