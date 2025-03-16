import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { searchParamsSchema, type SearchParams } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  showFrequencySlider?: boolean;
}

export function SearchFilters({ 
  onSearch, 
  defaultValues, 
  hideSearchButton,
  showFrequencySlider = false 
}: SearchFiltersProps) {
  const form = useForm<SearchParams>({
    resolver: zodResolver(searchParamsSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSearch)}
        onChange={() => form.handleSubmit(onSearch)()}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="query"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">Search</FormLabel>
              <FormControl>
                <Input 
                  placeholder="What are you looking for?" 
                  {...field}
                  className="bg-background/50 border-border/50 focus-visible:ring-primary/30"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marketplace"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90">Marketplace</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-card border-border/50">
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
                <FormLabel className="text-foreground/90">Min Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Min"
                    className="bg-background/50 border-border/50 focus-visible:ring-primary/30"
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
                <FormLabel className="text-foreground/90">Max Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Max"
                    className="bg-background/50 border-border/50 focus-visible:ring-primary/30"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {showFrequencySlider && (
          <FormField
            control={form.control}
            name="updateFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground/90">Update Frequency</FormLabel>
                <FormControl>
                  <Slider
                    min={10}
                    max={300}
                    step={10}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary/50"
                  />
                </FormControl>
                <FormDescription className="text-foreground/70">
                  {field.value} seconds between updates
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        {!hideSearchButton && (
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Search
          </Button>
        )}
      </form>
    </Form>
  );
}