import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { SearchParams, Product } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useWebSocket } from "@/hooks/use-websocket";
import { ConnectionStatus } from "@/components/connection-status";

interface Monitor {
  id: string;
  params: SearchParams;
  products: Product[];
  startTime: number;
}

function formatMonitorTitle(params: SearchParams): string {
  const parts = [];

  if (params.query && params.query.trim()) {
    parts.push(`"${params.query.trim()}"`);
  }

  if (params.marketplace && params.marketplace !== 'all') {
    parts.push(`on ${params.marketplace.toUpperCase()}`);
  }

  return parts.length > 0 ? parts.join(' ') : "All items on all marketplaces";
}

function formatPriceRange(params: SearchParams): string {
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? '∞';
    return `${min} - ${max} PLN`;
  }
  return '';
}

function formatUpdateFrequency(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}


export default function Monitor() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const deletedMonitorIds = useRef(new Set<string>());
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    marketplace: "all",
    minPrice: undefined,
    maxPrice: undefined,
    updateFrequency: 30
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, isConnecting } = useWebSocket({
    onMessage: (data) => {
      if (typeof data === 'object' && data !== null && 'type' in data) {
        //Existing WebSocket message handling remains unchanged
      }
    }
  });

  // Load deleted monitor IDs from localStorage on mount
  useEffect(() => {
    const storedIds = localStorage.getItem('deletedMonitorIds');
    if (storedIds) {
      deletedMonitorIds.current = new Set(JSON.parse(storedIds));
    }
  }, []);

  useEffect(() => {
    const loadMonitors = async () => {
      try {
        setIsLoading(true);
        const res = await apiRequest("GET", "/api/monitors");
        const data = await res.json();
        console.log("Loaded monitors:", data);

        // Filter out deleted monitors when setting initial state
        const activeMonitors = data
          .filter((monitor: any) => !deletedMonitorIds.current.has(monitor.id.toString()))
          .map((monitor: any) => ({
            id: monitor.id.toString(),
            params: typeof monitor.params === 'string'
              ? JSON.parse(monitor.params)
              : monitor.params,
            products: [],
            startTime: Date.parse(monitor.startTime) || Date.now()
          }));

        setMonitors(activeMonitors);
      } catch (error) {
        console.error('Failed to load monitors:', error);
        toast({
          title: "Error",
          description: "Failed to load monitors. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMonitors();
  }, [toast]);

  const startNewMonitor = async () => {
    try {
      console.log("Starting monitor with params:", searchParams);
      const res = await apiRequest("POST", "/api/monitor/start", searchParams);
      const data = await res.json();

      const newMonitor = {
        id: data.monitorId,
        params: searchParams,
        products: [],
        startTime: Date.now()
      };

      setMonitors(prev => [...prev, newMonitor]);

      toast({
        title: "Monitor Created Successfully!",
        description: "You will receive notifications when new items are found.",
        variant: "default",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error starting monitor:", error);
      toast({
        title: "Error",
        description: "Failed to start monitoring. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopMonitor = async (monitorId: string) => {
    try {
      console.log("Stopping monitor:", monitorId);
      await apiRequest("POST", "/api/monitor/stop", { monitorId });

      // Add to deleted monitors set and persist to localStorage
      deletedMonitorIds.current.add(monitorId);
      localStorage.setItem('deletedMonitorIds', JSON.stringify([...deletedMonitorIds.current]));

      // Remove from state
      setMonitors(prev => prev.filter(m => m.id !== monitorId));

      toast({
        title: "Monitor Stopped",
        description: "You will no longer receive notifications for this search.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error stopping monitor:", error);
      toast({
        title: "Error",
        description: "Failed to stop monitoring. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateMonitorProducts = (monitorId: string, newProducts: Product[]) => {
    // Only update if monitor hasn't been deleted
    if (!deletedMonitorIds.current.has(monitorId)) {
      console.log("Updating products for monitor", monitorId, "with", newProducts);
      setMonitors(prev => prev.map(monitor =>
        monitor.id === monitorId
          ? { ...monitor, products: [...newProducts, ...monitor.products] }
          : monitor
      ));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1428] flex items-center justify-center">
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1428]">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Tabs defaultValue="active">
            <div className="bg-[#241b35] border border-purple-700/30 rounded-lg shadow-sm">
              <TabsList className="w-full p-1 h-auto gap-1">
                <TabsTrigger
                  value="active"
                  className="flex-1 data-[state=active]:bg-primary/30 data-[state=active]:text-primary py-2.5 border-purple-700/30"
                >
                  Active Monitors
                </TabsTrigger>
                <TabsTrigger
                  value="create"
                  className="flex-1 data-[state=active]:bg-primary/30 data-[state=active]:text-primary py-2.5 border-purple-700/30"
                >
                  Create Monitor
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="active" className="space-y-6 mt-8">
              {monitors.length === 0 ? (
                <div className="text-center py-16 bg-[#241b35] rounded-lg border border-dashed border-purple-700/30">
                  <p className="text-gray-400">No active monitors. Create one to start tracking items.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {monitors.map((monitor) => (
                    <div key={monitor.id} className="group bg-[#241b35] rounded-lg border border-purple-700/30 shadow-sm hover:border-primary/20 hover:shadow-md transition-all">
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <ConnectionStatus isConnected={isConnected} isConnecting={isConnecting} />
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                {formatPriceRange(monitor.params) && (
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {formatPriceRange(monitor.params)}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full bg-primary/5">
                                  {formatUpdateFrequency(monitor.params.updateFrequency)}
                                </span>
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold text-primary truncate">
                              {formatMonitorTitle(monitor.params)}
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => stopMonitor(monitor.id)}
                            className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <ProductGrid
                          products={monitor.products}
                          isLoading={false}
                          isMonitoring={true}
                          monitorId={monitor.id}
                          onNewProducts={(products) => updateMonitorProducts(monitor.id, products)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="mt-8">
              <div className="bg-[#241b35] rounded-lg border border-purple-700/30 shadow-sm">
                <div className="p-6 space-y-6">
                  <Alert className="bg-primary/5 border-primary/20">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary/80">
                      Set your search criteria and update frequency, then start monitoring. You can have multiple monitors running at the same time.
                    </AlertDescription>
                  </Alert>

                  <SearchFilters
                    onSearch={setSearchParams}
                    defaultValues={searchParams}
                    hideSearchButton={true}
                    showFrequencySlider={true}
                  />

                  <Button
                    onClick={startNewMonitor}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Start New Monitor
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}