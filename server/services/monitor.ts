import { SearchParams, Product } from "@shared/schema";
import { marketplaceService } from "./marketplaces";
import { broadcastUpdate } from "../routes";
import { log } from "../vite";

class MonitoringService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private seenProducts: Map<string, Set<string>> = new Map();
  private currentId: number = 1;

  private generateMonitorId(params: SearchParams): string {
    return `${params.query || ''}_${params.marketplace || 'all'}_${params.minPrice || ''}_${params.maxPrice || ''}`;
  }

  startMonitoring(params: SearchParams) {
    const monitorId = this.generateMonitorId(params);

    if (this.monitoringIntervals.has(monitorId)) {
      log(`Monitor ${monitorId} already exists`);
      return monitorId;
    }

    this.seenProducts.set(monitorId, new Set());

    const interval = setInterval(async () => {
      try {
        const results = await Promise.allSettled([
          marketplaceService.searchOLX(params.query),
          marketplaceService.searchAllegro(params.query),
          marketplaceService.searchVinted(params.query)
        ]);

        const newProducts: Product[] = [];
        const seenSet = this.seenProducts.get(monitorId)!;

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            result.value.forEach((product) => {
              // Apply price filters
              if (params.minPrice && product.price < params.minPrice) return;
              if (params.maxPrice && product.price > params.maxPrice) return;

              // Apply marketplace filter
              if (params.marketplace && params.marketplace !== 'all' && product.marketplace !== params.marketplace) return;

              const productKey = `${product.marketplace}_${product.originalUrl}`;

              if (!seenSet.has(productKey)) {
                seenSet.add(productKey);
                const productWithId = { ...product, id: this.currentId++ };
                newProducts.push(productWithId);
              }
            });
          }
        });

        if (newProducts.length > 0) {
          log(`Found ${newProducts.length} new products for monitor ${monitorId}`);
          broadcastUpdate({
            type: 'new_monitored_products',
            products: newProducts,
            monitorId
          });
        }
      } catch (error) {
        log(`Error in monitor ${monitorId}: ${error}`);
      }
    }, 30000); // Check every 30 seconds

    this.monitoringIntervals.set(monitorId, interval);
    log(`Started monitor ${monitorId}`);
    return monitorId;
  }

  stopMonitoring(params: SearchParams) {
    const monitorId = this.generateMonitorId(params);
    const interval = this.monitoringIntervals.get(monitorId);

    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(monitorId);
      this.seenProducts.delete(monitorId);
      log(`Stopped monitor ${monitorId}`);
    }
  }

  stopAllMonitoring() {
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals.clear();
    this.seenProducts.clear();
    log('Stopped all monitors');
  }
}

export const monitoringService = new MonitoringService();