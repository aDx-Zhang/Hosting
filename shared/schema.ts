import { pgTable, text, serial, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Update products table to remove location fields
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  image: text("image").notNull(),
  marketplace: text("marketplace").notNull(),
  originalUrl: text("original_url").notNull(),
});

// Existing tables remain unchanged
export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  params: jsonb("params").notNull().$type<SearchParams>(),
  lastCheckedAt: timestamp("last_checked_at"),
  active: integer("active").default(1),
  updateFrequency: integer("update_frequency").default(30).notNull(),
  userId: integer("user_id").notNull(), // Add user association
});

export const monitorProducts = pgTable("monitor_products", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New tables for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: integer("active").default(1),
});

// Update search params to remove location fields
export const searchParamsSchema = z.object({
  query: z.string(),
  marketplace: z.enum(['all', 'olx', 'vinted', 'allegro']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  updateFrequency: z.number().min(10).max(300).default(30),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

// Existing schemas
export const insertProductSchema = createInsertSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;


// New schemas for authentication
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const registerSchema = loginSchema.extend({
  role: z.enum(['admin', 'user']).default('user'),
});

export const apiKeySchema = z.object({
  userId: z.number(),
  durationDays: z.number().min(1).max(365),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;