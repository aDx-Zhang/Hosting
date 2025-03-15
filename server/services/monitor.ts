import { SearchParams, Product } from "@shared/schema";
import { marketplaceService } from "./marketplaces";
import { broadcastUpdate } from "../routes";
import { log } from "../vite";

class MonitoringService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private seenProducts: Map<string, Set<string>> = new Map();
  private currentId: number = 1;

  private generateMonitorId(params: SearchParams): string {
    const parts = [];

    if (params.query) parts.push(params.query);
    if (params.marketplace && params.marketplace !== 'all') parts.push(params.marketplace);
    if (params.minPrice !== undefined) parts.push(`min${params.minPrice}`);
    if (params.maxPrice !== undefined) parts.push(`max${params.maxPrice}`);

    return parts.length > 0 ? parts.join('_') : 'all';
  }

  startMonitoring(params: SearchParams) {
    const monitorId = this.generateMonitorId(params);
    log(`Starting monitor with params: ${JSON.stringify(params)}`);

    if (this.monitoringIntervals.has(monitorId)) {
      log(`Monitor ${monitorId} already exists`);
      return monitorId;
    }

    this.seenProducts.set(monitorId, new Set());

    const interval = setInterval(async () => {
      try {
        log(`Checking for new products with query: ${params.query}`);
        const results = await Promise.allSettled([
          params.marketplace === 'all' || params.marketplace === 'olx' 
            ? marketplaceService.searchOLX(params.query)
            : Promise.resolve([]),
          params.marketplace === 'all' || params.marketplace === 'allegro' 
            ? marketplaceService.searchAllegro(params.query)
            : Promise.resolve([]),
          params.marketplace === 'all' || params.marketplace === 'vinted' 
            ? marketplaceService.searchVinted(params.query)
            : Promise.resolve([])
        ]);

        const newProducts: Product[] = [];
        const seenSet = this.seenProducts.get(monitorId)!;

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            result.value.forEach((product) => {
              // Apply price filters
              if (params.minPrice !== undefined && product.price < params.minPrice) return;
              if (params.maxPrice !== undefined && product.price > params.maxPrice) return;

              const productKey = `${product.marketplace}_${product.originalUrl}`;

              if (!seenSet.has(productKey)) {
                seenSet.add(productKey);
                const productWithId = { ...product, id: this.currentId++ };
                newProducts.push(productWithId);
                log(`Found new product: ${productWithId.title} for monitor ${monitorId}`);
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
    log(`Started monitor ${monitorId} with params: ${JSON.stringify(params)}`);
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