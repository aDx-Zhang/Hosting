import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { searchParamsSchema, type SearchParams } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  onSearch: (params: SearchParams) => void;
  defaultValues: SearchParams;
  hideSearchButton?: boolean;
}

export function SearchFilters({ onSearch, defaultValues, hideSearchButton }: SearchFiltersProps) {
  const form = useForm<SearchParams>({
    resolver: zodResolver(searchParamsSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSearch)}
        className="space-y-4 p-4 bg-white rounded-lg shadow-sm"
        onChange={() => form.handleSubmit(onSearch)()}
      >
        <FormField
          control={form.control}
          name="query"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search</FormLabel>
              <FormControl>
                <Input placeholder="What are you looking for?" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marketplace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marketplace</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Marketplaces</SelectItem>
                  <SelectItem value="olx">OLX</SelectItem>
                  <SelectItem value="vinted">Vinted</SelectItem>
                  <SelectItem value="allegro">Allegro Lokalne</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Min"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Max"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {!hideSearchButton && (
          <Button type="submit" className="w-full">
            Search
          </Button>
        )}
      </form>
    </Form>
  );
}