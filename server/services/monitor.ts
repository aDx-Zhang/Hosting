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
      const { id: monitorId } = await storage.createMonitor(params, userId);
      const intervalId = monitorId.toString();

      if (this.monitoringIntervals.has(intervalId)) {
        log(`Monitor ${intervalId} already exists`);
        return { monitorId: intervalId };
      }

      // Use the custom update frequency or default to 30 seconds
      const updateFrequency = (params.updateFrequency || 30) * 1000; // Convert to milliseconds
      log(`Setting update frequency to ${updateFrequency}ms for monitor ${intervalId}`);

      const interval = setInterval(async () => {
        try {
          log(`Checking for new products with query: ${params.query}`);
          const results = await Promise.allSettled([
            marketplaceService.searchOLX(params.query || ''),
            marketplaceService.searchAllegro(params.query || ''),
            marketplaceService.searchVinted(params.query || '')
          ]);

          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              result.value.forEach(async (product) => {
                // Skip if product doesn't match price range
                const productPrice = Number(product.price);
                if (params.minPrice !== undefined && productPrice < params.minPrice) {
                  log(`Skipping product ${product.title} (price ${product.price} < min ${params.minPrice})`);
                  return;
                }
                if (params.maxPrice !== undefined && productPrice > params.maxPrice) {
                  log(`Skipping product ${product.title} (price ${product.price} > max ${params.maxPrice})`);
                  return;
                }

                // Skip if product doesn't match marketplace
                if (params.marketplace && params.marketplace !== 'all' && product.marketplace !== params.marketplace) {
                  log(`Skipping product ${product.title} (marketplace ${product.marketplace} != ${params.marketplace})`);
                  return;
                }

                // Store product in database and associate with monitor
                await storage.addProductToMonitor(monitorId, product);
                log(`Found new product: ${product.title} for monitor ${monitorId}`);
              });
            }
          });
        } catch (error) {
          log(`Error in monitor ${monitorId}: ${error}`);
        }
      }, updateFrequency);

      this.monitoringIntervals.set(intervalId, interval);
      log(`Started monitor ${intervalId} with params: ${JSON.stringify(params)}`);
      return { monitorId: intervalId };
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