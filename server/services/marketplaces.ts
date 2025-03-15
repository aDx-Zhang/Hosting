import axios from 'axios';
import puppeteer from 'puppeteer';
import { log } from "../vite";
import type { InsertProduct } from "@shared/schema";

export class MarketplaceService {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
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
          let photoUrl = this.getDefaultImage();
          if (item.photos && item.photos.length > 0) {
            photoUrl = item.photos[0].link;
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
        executablePath: 'chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--window-size=1920,1080'
        ]
      });

      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(60000); // Increase timeout to 60 seconds
      await page.setDefaultTimeout(60000);

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      const url = `https://www.vinted.pl/catalog?search_text=${encodeURIComponent(query)}`;
      log(`Accessing Vinted URL: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle0' });
      log('Page loaded, waiting for content...');

      // Wait for the cookie banner and accept if present
      try {
        const cookieSelector = 'button[data-testid="cookie-banner-accept"]';
        await page.waitForSelector(cookieSelector, { timeout: 5000 });
        await page.click(cookieSelector);
        log('Accepted cookies');
      } catch (error) {
        log('No cookie banner found or already accepted');
      }

      // Wait a bit for the page to fully load
      await page.waitForTimeout(5000);

      // Scroll down to load more items
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(2000);

      // Wait for the catalog items to be present
      const itemSelector = '.feed-grid__item, div[data-testid="item-box"], .web_ui__ItemBox__container';
      await page.waitForSelector(itemSelector, { timeout: 10000 });
      log('Items found, extracting data...');

      // Extract product data
      const products = await page.evaluate((itemSelector) => {
        const items = document.querySelectorAll(itemSelector);
        return Array.from(items, item => {
          const titleEl = item.querySelector('h2, .web_ui__ItemBox__title, .ItemBox_title__OaKlq');
          const priceEl = item.querySelector('[data-testid="price"], .web_ui__ItemBox__price, .ItemBox_price__K3ZM3');
          const imageEl = item.querySelector('img');
          const linkEl = item.querySelector('a');

          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.trim() || '';
          const image = imageEl?.getAttribute('src') || '';
          const link = linkEl?.getAttribute('href') || '';

          // Extract price from text like "100,00 zł"
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
      }, itemSelector);

      log(`Successfully extracted ${products.length} products from Vinted`);
      await browser.close();
      return products.filter(p => p.title && p.price > 0);

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