import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { SearchParams, Product } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Monitor {
  id: string;
  params: SearchParams;
  products: Product[];
}

export default function Monitor() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    marketplace: "all"
  });
  const { toast } = useToast();

  const handleSearch = async (params: SearchParams) => {
    setSearchParams(params);
  };

  const startNewMonitor = async () => {
    try {
      // Generate a unique ID for the monitor
      const monitorId = `${searchParams.query}_${searchParams.marketplace}_${Date.now()}`;

      // Start monitoring on the backend
      await apiRequest("POST", "/api/monitor/start", searchParams);

      // Add new monitor to the state
      setMonitors(prev => [...prev, {
        id: monitorId,
        params: { ...searchParams },
        products: []
      }]);

      toast({
        title: "Monitor Created Successfully!",
        description: "You will receive notifications when new items are found.",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start monitoring. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stopMonitor = async (monitorId: string) => {
    try {
      const monitor = monitors.find(m => m.id === monitorId);
      if (monitor) {
        await apiRequest("POST", "/api/monitor/stop", monitor.params);
        setMonitors(prev => prev.filter(m => m.id !== monitorId));

        toast({
          title: "Monitor Stopped",
          description: "You will no longer receive notifications for this search.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop monitoring. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateMonitorProducts = (monitorId: string, newProducts: Product[]) => {
    setMonitors(prev => prev.map(monitor => 
      monitor.id === monitorId
        ? { ...monitor, products: [...newProducts, ...monitor.products] }
        : monitor
    ));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#202124]">
            Monitor Items
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Monitors</TabsTrigger>
              <TabsTrigger value="create">Create Monitor</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {monitors.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                  <p className="text-muted-foreground">No active monitors. Create one to start tracking items.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monitors.map((monitor) => (
                    <div key={monitor.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">
                            Monitoring: {monitor.params.query || "All Items"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Marketplace: {monitor.params.marketplace}
                            {monitor.params.minPrice && ` | Min: ${monitor.params.minPrice} PLN`}
                            {monitor.params.maxPrice && ` | Max: ${monitor.params.maxPrice} PLN`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => stopMonitor(monitor.id)}
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
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              <div className="bg-white rounded-lg shadow p-6">
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Set your search criteria and start monitoring. You can have multiple monitors running at the same time.
                  </AlertDescription>
                </Alert>

                <SearchFilters
                  onSearch={handleSearch}
                  defaultValues={searchParams}
                />

                <div className="mt-4">
                  <Button 
                    onClick={startNewMonitor}
                    className="w-full bg-green-600 hover:bg-green-700"
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