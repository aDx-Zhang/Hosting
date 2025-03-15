import axios from 'axios';
import puppeteer from 'puppeteer';
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
    let browser;
    try {
      log(`Starting Vinted scraping for query: ${query}`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const searchUrl = `https://www.vinted.pl/catalog?search_text=${encodeURIComponent(query)}`;
      log(`Accessing Vinted URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      log('Page loaded, waiting for content...');

      // Wait for items to load
      await page.waitForSelector('.feed-grid__item', { timeout: 10000 });
      log('Items container found, extracting data...');

      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.feed-grid__item');
        return Array.from(items, item => {
          const titleEl = item.querySelector('.ItemBox_title__OaKlq');
          const priceEl = item.querySelector('.ItemBox_price__K3ZM3');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';

          // Extract price number
          const priceMatch = priceText.match(/\d+([.,]\d+)?/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

          return {
            title,
            description: title,
            price,
            image,
            marketplace: 'vinted',
            originalUrl: link.startsWith('http') ? link : `https://www.vinted.pl${link}`,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      });

      log(`Successfully extracted ${products.length} products from Vinted`);
      await browser.close();
      return products;

    } catch (error) {
      log(`Error scraping Vinted: ${error}`);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    return [];
  }
}

export const marketplaceService = new MarketplaceService();