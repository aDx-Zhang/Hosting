import puppeteer from 'puppeteer';
import { log } from '../vite';
import type { InsertProduct } from '@shared/schema';

export class WebScraper {
  private async setupBrowser() {
    return await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });
  }

  async searchOLX(query: string): Promise<InsertProduct[]> {
    try {
      log(`Starting OLX scraping for query: ${query}`);
      const browser = await this.setupBrowser();

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const searchUrl = `https://www.olx.pl/oferty/q-${encodeURIComponent(query)}/`;
      log(`Accessing URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-cy="l-card"]');
        return Array.from(items, item => {
          const titleEl = item.querySelector('[data-testid="ad-title"]');
          const priceEl = item.querySelector('[data-testid="ad-price"]');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a');
          const locationEl = item.querySelector('[data-testid="location-date"]');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';
          const description = locationEl?.textContent?.trim() || '';

          // Extract price number
          const priceMatch = priceText.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

          return {
            title,
            description,
            price: numericPrice,
            image,
            marketplace: 'olx',
            originalUrl: link.startsWith('http') ? link : `https://olx.pl${link}`,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      });

      await browser.close();
      log(`Found ${products.length} products from OLX`);
      return products;
    } catch (error) {
      log(`Error scraping OLX: ${error}`);
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    try {
      log(`Starting Allegro scraping for query: ${query}`);
      const browser = await this.setupBrowser();

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const searchUrl = `https://allegro.pl/listing?string=${encodeURIComponent(query)}`;
      log(`Accessing URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('article[data-role="offer"]');
        return Array.from(items, item => {
          const titleEl = item.querySelector('[data-role="offer-title"]');
          const priceEl = item.querySelector('[data-role="offer-price"]');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a[data-role="offer-link"]');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';

          // Extract price number
          const priceMatch = priceText.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

          return {
            title,
            description: 'Allegro Lokalne',
            price: numericPrice,
            image,
            marketplace: 'allegro',
            originalUrl: link,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      });

      await browser.close();
      log(`Found ${products.length} products from Allegro`);
      return products;
    } catch (error) {
      log(`Error scraping Allegro: ${error}`);
      return [];
    }
  }
}

export const webScraper = new WebScraper();