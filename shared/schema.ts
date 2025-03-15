import { pgTable, text, serial, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  image: text("image").notNull(),
  marketplace: text("marketplace").notNull(),
  originalUrl: text("original_url").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const insertProductSchema = createInsertSchema(products).pick({
  title: true,
  description: true,
  price: true,
  image: true,
  marketplace: true,
  originalUrl: true,
  latitude: true,
  longitude: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const searchParamsSchema = z.object({
  query: z.string().min(1),
  marketplace: z.enum(['all', 'olx', 'vinted', 'allegro']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  // Keep these but make them optional since we're not using the map for now
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;