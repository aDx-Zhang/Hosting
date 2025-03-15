import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SearchParams, Product } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";
import { MapSearch } from "@/components/map-search";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    lat: 52.2297,
    lng: 21.0122,
    radius: 10,
    marketplace: "all"
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/search", searchParams],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/products/search", searchParams);
      return res.json();
    }
  });

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSearchParams(prev => ({ ...prev, lat, lng }));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#202124]">
            Polish Marketplace Search
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <SearchFilters
              onSearch={handleSearch}
              defaultValues={searchParams}
            />

            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
              <Label>Search Radius (km)</Label>
              <Slider
                value={[searchParams.radius]}
                onValueChange={([value]) => {
                  setSearchParams(prev => ({ ...prev, radius: value }));
                }}
                max={50}
                min={1}
                step={1}
              />
              <p className="text-sm text-muted-foreground text-center">
                {searchParams.radius} km
              </p>
            </div>

            <MapSearch
              onLocationSelect={handleLocationSelect}
              radius={searchParams.radius}
            />
          </div>

          <div className="lg:col-span-2">
            <ProductGrid
              products={products || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}