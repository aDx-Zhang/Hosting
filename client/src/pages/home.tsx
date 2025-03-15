import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SearchParams, Product } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    lat: 52.2297, // Default to Warsaw coordinates
    lng: 21.0122,
    radius: 10,
    marketplace: "all"
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/search", searchParams],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/products/search", searchParams);
      return res.json();
    },
    enabled: searchParams.query.length > 0
  });

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
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
        <div className="max-w-2xl mx-auto">
          <SearchFilters
            onSearch={handleSearch}
            defaultValues={searchParams}
          />

          <div className="mt-8">
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