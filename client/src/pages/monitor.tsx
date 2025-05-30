import { useState, useEffect } from "react";
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

interface Monitor {
  id: string;
  params: SearchParams;
  products: Product[];
}

function formatMonitorTitle(params: SearchParams): string {
  const parts = [];

  if (params.query && params.query.trim()) {
    parts.push(`"${params.query.trim()}"`);
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const priceRange = [];
    if (params.minPrice !== undefined) priceRange.push(`${params.minPrice} PLN`);
    if (params.maxPrice !== undefined) priceRange.push(`${params.maxPrice} PLN`);
    parts.push(`(${priceRange.join(' - ')})`);
  }

  if (params.marketplace && params.marketplace !== 'all') {
    parts.push(`on ${params.marketplace.toUpperCase()}`);
  }

  return parts.length > 0 ? parts.join(' ') : "All items on all marketplaces";
}


export default function Monitor() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    marketplace: "all",
    minPrice: undefined,
    maxPrice: undefined,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const loadMonitors = async () => {
      try {
        const res = await apiRequest("GET", "/api/monitors");
        const data = await res.json();
        console.log("Loaded monitors:", data);
        // Initialize monitors with empty product arrays
        setMonitors(data.map((monitor: any) => ({
          id: monitor.id.toString(),
          params: typeof monitor.params === 'string'
            ? JSON.parse(monitor.params)
            : monitor.params,
          products: [] // Always start with empty products array
        })));
      } catch (error) {
        console.error('Failed to load monitors:', error);
      }
    };

    loadMonitors();
  }, []);

  const startNewMonitor = async () => {
    try {
      console.log("Starting monitor with params:", searchParams);
      const res = await apiRequest("POST", "/api/monitor/start", {
        ...searchParams,
        updateFrequency: 30 // Fixed 30-second interval
      });
      const data = await res.json();

      // Add new monitor with empty products array
      setMonitors(prev => [...prev, {
        id: data.monitorId,
        params: searchParams,
        products: []
      }]);

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

  const updateMonitorProducts = (monitorId: string, newProducts: Product[]) => {
    console.log("Updating products for monitor", monitorId, "with", newProducts);
    setMonitors(prev => prev.map(monitor =>
      monitor.id === monitorId
        ? { ...monitor, products: [...newProducts, ...monitor.products] }
        : monitor
    ));
  };

  const stopMonitor = async (monitorId: string) => {
    try {
      console.log("Stopping monitor:", monitorId);
      await apiRequest("POST", "/api/monitor/stop", { monitorId });
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
                        <div className="flex items-center justify-between mb-6">
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-primary">
                              {formatMonitorTitle(monitor.params)}
                            </h3>
                            <p className="text-sm text-gray-400">
                              Updates every 30 seconds
                            </p>
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
                      Set your search criteria and start monitoring. You can have multiple monitors running at the same time.
                    </AlertDescription>
                  </Alert>

                  <SearchFilters
                    onSearch={setSearchParams}
                    defaultValues={searchParams}
                    hideSearchButton={true}
                    showFrequencySlider={false}
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