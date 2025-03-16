import { SearchParams, Product } from "@shared/schema";
import { marketplaceService } from "./marketplaces";
import { broadcastUpdate } from "../routes";
import { storage } from "../storage";
import { log } from "../vite";

class MonitoringService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  async startMonitoring(params: SearchParams, userId: number) {
    try {
      // Create monitor in database with userId
      const { id } = await storage.createMonitor(params, userId);
      const monitorId = id.toString();

      if (this.monitoringIntervals.has(monitorId)) {
        log(`Monitor ${monitorId} already exists`);
        return { monitorId };
      }

      // Use the custom update frequency or default to 30 seconds
      const updateFrequency = (params.updateFrequency || 30) * 1000; // Convert to milliseconds
      log(`Setting update frequency to ${updateFrequency}ms for monitor ${monitorId}`);

      const interval = setInterval(async () => {
        try {
          log(`Checking for new products with query: ${params.query}`);
          const results = await Promise.allSettled([
            marketplaceService.searchOLX(params.query || ''),
            marketplaceService.searchAllegro(params.query || ''),
            marketplaceService.searchVinted(params.query || '')
          ]);

          const newProducts: Product[] = [];
          for (const result of results) {
            if (result.status === 'fulfilled') {
              for (const product of result.value) {
                // Skip if product doesn't match price range
                const productPrice = parseFloat(product.price.toString());
                if (params.minPrice !== undefined && productPrice < params.minPrice) {
                  log(`Skipping product ${product.title} (price ${productPrice} < min ${params.minPrice})`);
                  continue;
                }
                if (params.maxPrice !== undefined && productPrice > params.maxPrice) {
                  log(`Skipping product ${product.title} (price ${productPrice} > max ${params.maxPrice})`);
                  continue;
                }

                // Skip if product doesn't match marketplace
                if (params.marketplace && params.marketplace !== 'all' && product.marketplace !== params.marketplace) {
                  log(`Skipping product ${product.title} (marketplace ${product.marketplace} != ${params.marketplace})`);
                  continue;
                }

                try {
                  // Store product in database and associate with monitor
                  await storage.addProductToMonitor(id, product);
                  newProducts.push(product);
                  log(`Found new product: ${product.title} for monitor ${monitorId}`);
                } catch (error) {
                  log(`Error storing product: ${error}`);
                }
              }
            }
          }

          if (newProducts.length > 0) {
            broadcastUpdate({
              type: 'new_monitored_products',
              products: newProducts,
              monitorId
            });
          }
        } catch (error) {
          log(`Error in monitor ${monitorId}: ${error}`);
        }
      }, updateFrequency);

      this.monitoringIntervals.set(monitorId, interval);
      log(`Started monitor ${monitorId} with params: ${JSON.stringify(params)}`);
      return { monitorId };
    } catch (error) {
      log(`Error starting monitor: ${error}`);
      throw error;
    }
  }

  async stopMonitoring(monitorId: string) {
    try {
      const interval = this.monitoringIntervals.get(monitorId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(monitorId);
        await storage.deactivateMonitor(parseInt(monitorId));
        log(`Stopped monitor ${monitorId}`);
      }
    } catch (error) {
      log(`Error stopping monitor: ${error}`);
      throw error;
    }
  }

  stopAllMonitoring() {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals.clear();
    log('Stopped all monitors');
  }
}

export const monitoringService = new MonitoringService();