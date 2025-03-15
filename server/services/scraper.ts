import puppeteer from 'puppeteer';
import { log } from '../vite';
import type { InsertProduct } from '@shared/schema';

export class WebScraper {
  async searchOLX(query: string): Promise<InsertProduct[]> {
    try {
      log(`Starting OLX scraping for query: ${query}`);
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const searchUrl = `https://www.olx.pl/oferty/q-${encodeURIComponent(query)}/`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });
      
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-cy="l-card"]');
        return Array.from(items).map(item => {
          const title = item.querySelector('h6')?.textContent || '';
          const price = item.querySelector('[data-testid="ad-price"]')?.textContent || '';
          const image = item.querySelector('img')?.getAttribute('src') || '';
          const link = item.querySelector('a')?.getAttribute('href') || '';
          const description = item.querySelector('[data-testid="location-date"]')?.textContent || '';
          
          // Extract price number
          const priceMatch = price.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;
          
          return {
            title,
            description,
            price: numericPrice,
            image,
            marketplace: 'olx',
            originalUrl: link.startsWith('http') ? link : `https://olx.pl${link}`,
            latitude: 52.2297, // Default to Warsaw coordinates
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
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const searchUrl = `https://allegro.pl/listing?string=${encodeURIComponent(query)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle0' });
      
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-analytics-view-custom-index]');
        return Array.from(items).map(item => {
          const title = item.querySelector('h2')?.textContent || '';
          const price = item.querySelector('[aria-label*="cena"]')?.textContent || '';
          const image = item.querySelector('img')?.getAttribute('src') || '';
          const link = item.querySelector('a')?.getAttribute('href') || '';
          
          // Extract price number
          const priceMatch = price.match(/\d+([.,]\d+)?/);
          const numericPrice = priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0;
          
          return {
            title,
            description: 'Allegro Lokalne',
            price: numericPrice,
            image,
            marketplace: 'allegro',
            originalUrl: link,
            latitude: 52.2297, // Default to Warsaw coordinates
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
