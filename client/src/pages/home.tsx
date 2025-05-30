import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SearchParams, Product } from "@shared/schema";
import { SearchFilters } from "@/components/search-filters";
import { ProductGrid } from "@/components/product-grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    marketplace: "all",
    minPrice: undefined,
    maxPrice: undefined,
    updateFrequency: 30
  });

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products/search", searchParams],
    queryFn: async () => {
      console.log('Searching with params:', searchParams); // Debug log
      const res = await apiRequest("POST", "/api/products/search", {
        ...searchParams,
        query: searchParams.query || "" // Allow empty query to show all products
      });
      const data = await res.json();
      console.log('Search results:', data); // Debug log
      return data;
    }
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
          {error?.message?.includes('verification pending') && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aplikacja jest w trakcie weryfikacji przez Allegro. Proszę dokończyć proces weryfikacji w panelu developera Allegro.
              </AlertDescription>
            </Alert>
          )}

          {error?.message?.includes('Failed to authenticate') && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Problem z autoryzacją Allegro. Upewnij się, że wszystkie wymagane uprawnienia są włączone w panelu developera:
                - allegro.api.offers.read
              </AlertDescription>
            </Alert>
          )}

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