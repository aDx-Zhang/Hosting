import { useState, useCallback, useRef } from 'react';
import type { Product } from "@shared/schema";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarketplaceBadge } from "./marketplace-badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStatus } from "./connection-status";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  isMonitoring?: boolean;
  monitorId?: string;
  onNewProducts?: (products: Product[]) => void;
}

export function ProductGrid({ 
  products: initialProducts, 
  isLoading, 
  isMonitoring,
  monitorId,
  onNewProducts 
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  const seenProducts = useRef(new Set<string>());

  const isProductUnique = (product: Product) => {
    const key = `${product.originalUrl}-${product.marketplace}`;
    if (seenProducts.current.has(key)) {
      return false;
    }
    seenProducts.current.add(key);
    return true;
  };

  const handleRealTimeUpdate = useCallback((data: unknown) => {
    if (typeof data === 'object' && data !== null && 'type' in data) {
      switch (data.type) {
        case 'new_monitored_products': {
          const update = data as { type: string; products: Product[]; monitorId: string };
          if (monitorId && update.monitorId === monitorId) {
            // Filter out duplicates
            const uniqueProducts = update.products.filter(isProductUnique);
            if (uniqueProducts.length > 0) {
              onNewProducts?.(uniqueProducts);
              setProducts(prev => [...uniqueProducts, ...prev]);
              toast({
                title: 'New Products Found!',
                description: `Found ${uniqueProducts.length} new items matching your criteria.`,
              });
            }
          }
          break;
        }
        case 'new_product': {
          const update = data as { type: string; product: Product };
          if (isProductUnique(update.product)) {
            setProducts(prev => [update.product, ...prev]);
            toast({
              title: 'New Product',
              description: `${update.product.title} was just listed!`,
            });
          }
          break;
        }
      }
    }
  }, [toast, monitorId, onNewProducts]);

  const { isConnected, isConnecting } = useWebSocket({ 
    onMessage: isMonitoring ? handleRealTimeUpdate : undefined 
  });

  if (isMonitoring) {
    return (
      <div>
        <div className="mb-4">
          <ConnectionStatus isConnected={isConnected} isConnecting={isConnecting} />
        </div>
        {renderProducts()}
      </div>
    );
  }

  return renderProducts();

  function renderProducts() {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Use only the products from state for display
    const displayProducts = products;

    if (displayProducts.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Monitoring for new products...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayProducts.map((product) => (
          <Card key={`${product.originalUrl}-${product.marketplace}`} className="overflow-hidden hover:border-primary/20 transition-colors">
            <div className="h-48 relative">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <MarketplaceBadge marketplace={product.marketplace} />
              </div>
            </div>
            <CardHeader className="p-4">
              <h3 className="font-semibold text-lg line-clamp-1">{product.title}</h3>
              <p className="text-2xl font-bold text-primary">
                {Number(product.price).toLocaleString('pl-PL', {
                  style: 'currency',
                  currency: 'PLN',
                })}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            </CardContent>
            <CardFooter className="p-4">
              <Button
                className="w-full"
                onClick={() => window.open(product.originalUrl, '_blank')}
              >
                View on {product.marketplace.toUpperCase()}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}