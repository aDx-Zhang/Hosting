import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { SearchParams } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Monitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    marketplace: "all"
  });
  const { toast } = useToast();

  const handleSearch = async (params: SearchParams) => {
    setSearchParams(params);

    if (isMonitoring) {
      // Stop current monitoring
      await apiRequest("POST", "/api/monitor/stop", searchParams);
      // Start new monitoring with updated params
      await apiRequest("POST", "/api/monitor/start", params);

      toast({
        title: "Monitor Updated",
        description: "Your monitoring criteria have been updated.",
      });
    }
  };

  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await apiRequest("POST", "/api/monitor/stop", searchParams);
        setProducts([]);
      } else {
        await apiRequest("POST", "/api/monitor/start", searchParams);
      }

      setIsMonitoring(!isMonitoring);
      toast({
        title: isMonitoring ? "Monitoring Stopped" : "Monitoring Started",
        description: isMonitoring 
          ? "You will no longer receive notifications for new items." 
          : "You will receive notifications when new items are found.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle monitoring. Please try again.",
        variant: "destructive",
      });
    }
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
        <div className="max-w-2xl mx-auto">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Set your search criteria and start monitoring. You'll be notified when new items are found.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={toggleMonitoring}
              variant={isMonitoring ? "destructive" : "default"}
            >
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
          </div>

          <SearchFilters
            onSearch={handleSearch}
            defaultValues={searchParams}
          />

          <div className="mt-8">
            <ProductGrid
              products={products}
              isLoading={false}
              isMonitoring={isMonitoring}
            />
          </div>
        </div>
      </main>
    </div>
  );
}