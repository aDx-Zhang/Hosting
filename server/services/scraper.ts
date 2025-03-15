import puppeteer from 'puppeteer';
import { log } from '../vite';
import type { InsertProduct } from '@shared/schema';

export class WebScraper {
  private async setupBrowser() {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--window-size=1920,1080'
      ]
    });
  }

  async searchOLX(query: string): Promise<InsertProduct[]> {
    let browser;
    try {
      log(`Starting OLX scraping for query: ${query}`);
      browser = await this.setupBrowser();

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const searchUrl = `https://www.olx.pl/d/oferty/q-${encodeURIComponent(query)}/`;
      log(`Accessing OLX URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      log('Page loaded, waiting for content...');

      // Wait for the listings container
      await page.waitForSelector('[data-testid="listing-grid"]', { timeout: 10000 });
      log('Listings container found, extracting data...');

      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-cy="l-card"]');
        log(`Found ${items.length} items on the page`);

        return Array.from(items, item => {
          const titleEl = item.querySelector('h6');
          const priceEl = item.querySelector('p[data-testid="ad-price"]');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';
          const description = item.textContent?.trim() || '';

          // Extract price number
          const priceMatch = priceText.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

          return {
            title,
            description,
            price: numericPrice,
            image,
            marketplace: 'olx',
            originalUrl: link.startsWith('http') ? link : `https://www.olx.pl${link}`,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      });

      log(`Successfully extracted ${products.length} products from OLX`);
      await browser.close();
      return products;

    } catch (error) {
      log(`Error scraping OLX: ${error}`);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }

  async searchAllegro(query: string): Promise<InsertProduct[]> {
    let browser;
    try {
      log(`Starting Allegro scraping for query: ${query}`);
      browser = await this.setupBrowser();

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      const searchUrl = `https://allegro.pl/listing?string=${encodeURIComponent(query)}`;
      log(`Accessing Allegro URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      log('Page loaded, waiting for content...');

      // Wait for listings to load
      await page.waitForSelector('[data-box-name="items-v3"]', { timeout: 10000 });
      log('Listings container found, extracting data...');

      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-box-name="items-v3"] > div > div');
        log(`Found ${items.length} items on the page`);

        return Array.from(items, item => {
          const titleEl = item.querySelector('h2');
          const priceEl = item.querySelector('[aria-label*="cena"]');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';

          // Extract price number
          const priceMatch = priceText.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;

          return {
            title,
            description: title,
            price: numericPrice,
            image,
            marketplace: 'allegro',
            originalUrl: link,
            latitude: 52.2297,
            longitude: 21.0122
          };
        });
      });

      log(`Successfully extracted ${products.length} products from Allegro`);
      await browser.close();
      return products;

    } catch (error) {
      log(`Error scraping Allegro: ${error}`);
      if (browser) {
        await browser.close();
      }
      return [];
    }
  }
}

export const webScraper = new WebScraper();