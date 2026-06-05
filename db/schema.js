import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  collection: text("collection").notNull(),
  line: text("line").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  badge: text("badge"),
  image: text("image").notNull(),
  description: text("description").notNull(),
  material: text("material"),
  fit: text("fit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  postalCode: text("postal_code"),
  address1: text("address1").notNull(),
  address2: text("address2"),
  memo: text("memo"),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  provider: text("provider").notNull().default("toss"),
  paymentKey: text("payment_key").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  paymentId: text("payment_id"),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
