import { SearchParams, Product } from "@shared/schema";
import { storage } from "../storage";
import { log } from "../vite";
import { broadcastUpdate } from "../routes";

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

      // Use a 30-second update frequency
      const updateFrequency = 30 * 1000; // 30 seconds
      log(`Setting update frequency to ${updateFrequency}ms for monitor ${monitorId}`);

      const interval = setInterval(async () => {
        try {
          // Add monitorId to search params
          const searchParams = {
            ...params,
            monitorId
          };

          log(`Checking for new products with params:`, searchParams);

          // Pass the monitor creation time to filter old products
          const monitor = await storage.getMonitorById(parseInt(monitorId));
          if (!monitor) {
            log(`Monitor ${monitorId} not found`);
            return;
          }

          const products = await storage.searchProducts(searchParams, monitor.createdAt);
          log(`Found ${products.length} products for monitor ${monitorId}`);

          if (products.length > 0) {
            broadcastUpdate({
              type: 'new_monitored_products',
              products,
              monitorId
            });
          }
        } catch (error) {
          log(`Error in monitor ${monitorId}: ${error}`);
        }
      }, updateFrequency);

      this.monitoringIntervals.set(monitorId, interval);
      log(`Started monitor ${monitorId} with params: ${JSON.stringify(params)}`);
      return { id };
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