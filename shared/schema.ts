import { pgTable, text, serial, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
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

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  params: jsonb("params").notNull().$type<SearchParams>(),
  lastCheckedAt: timestamp("last_checked_at"),
  active: integer("active").default(1),
});

export const monitorProducts = pgTable("monitor_products", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  query: z.string(),
  marketplace: z.enum(['all', 'olx', 'vinted', 'allegro']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;