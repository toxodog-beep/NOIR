import { randomUUID } from "node:crypto";

import {
  buildOrderLineItems,
  calculateCartTotals,
  canTransitionOrder,
  createOrderId,
  decrementStock,
  getOrderName,
} from "../../src/lib/commerce.mjs";
import { seedProducts } from "../../src/lib/seed-products.mjs";

const memory = {
  products: seedProducts.map((product) => ({ ...product })),
  orders: new Map(),
  orderItems: new Map(),
  payments: new Map(),
  refunds: [],
};

let sqlClient = null;
let schemaReady = false;

export async function listProducts({ includeHidden = false } = {}) {
  const sql = await getSql();
  if (!sql) {
    return memory.products.filter((product) => includeHidden || product.visible);
  }

  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, slug, name, category, collection, line, price, stock, visible, badge, image,
           description, material, fit
    FROM products
    ORDER BY collection, name
  `;

  if (!rows.length) return seedProducts.filter((product) => includeHidden || product.visible);
  return rows.map(mapProductRow).filter((product) => includeHidden || product.visible);
}

export async function findProductBySlug(slug) {
  const products = await listProducts({ includeHidden: true });
  return products.find((product) => product.slug === slug) || null;
}

export async function saveProduct(input) {
  const product = normalizeProduct(input);
  const sql = await getSql();

  if (!sql) {
    const index = memory.products.findIndex((item) => item.id === product.id);
    if (index >= 0) memory.products[index] = product;
    else memory.products.push(product);
    return product;
  }

  await ensureSchema(sql);
  await sql`
    INSERT INTO products (
      id, slug, name, category, collection, line, price, stock, visible, badge, image,
      description, material, fit, updated_at
    ) VALUES (
      ${product.id}, ${product.slug}, ${product.name}, ${product.category}, ${product.collection},
      ${product.line}, ${product.price}, ${product.stock}, ${product.visible}, ${product.badge},
      ${product.image}, ${product.description}, ${product.material}, ${product.fit}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      collection = EXCLUDED.collection,
      line = EXCLUDED.line,
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      visible = EXCLUDED.visible,
      badge = EXCLUDED.badge,
      image = EXCLUDED.image,
      description = EXCLUDED.description,
      material = EXCLUDED.material,
      fit = EXCLUDED.fit,
      updated_at = NOW()
  `;

  return product;
}

export async function createOrder({ cartItems, customer }) {
  const products = await listProducts();
  const items = buildOrderLineItems(cartItems, products);
  const totals = calculateCartTotals(items);

  if (!items.length) {
    const error = new Error("Cart is empty");
    error.statusCode = 400;
    throw error;
  }

  const order = {
    id: createOrderId("order"),
    status: "pending",
    customerName: required(customer?.name, "customer name"),
    customerPhone: required(customer?.phone, "customer phone"),
    customerEmail: String(customer?.email || "").trim(),
    postalCode: String(customer?.postalCode || "").trim(),
    address1: required(customer?.address1, "address"),
    address2: String(customer?.address2 || "").trim(),
    memo: String(customer?.memo || "").trim(),
    orderName: getOrderName(items),
    ...totals,
    createdAt: new Date().toISOString(),
  };

  const sql = await getSql();
  if (!sql) {
    memory.orders.set(order.id, order);
    memory.orderItems.set(order.id, items);
    return { order, items };
  }

  await ensureSchema(sql);
  await sql`
    INSERT INTO orders (
      id, status, customer_name, customer_phone, customer_email, postal_code, address1,
      address2, memo, subtotal, shipping, total
    ) VALUES (
      ${order.id}, ${order.status}, ${order.customerName}, ${order.customerPhone},
      ${order.customerEmail}, ${order.postalCode}, ${order.address1}, ${order.address2},
      ${order.memo}, ${order.subtotal}, ${order.shipping}, ${order.total}
    )
  `;

  for (const item of items) {
    await sql`
      INSERT INTO order_items (id, order_id, product_id, slug, name, image, price, quantity)
      VALUES (
        ${randomUUID()}, ${order.id}, ${item.productId}, ${item.slug}, ${item.name},
        ${item.image}, ${item.price}, ${item.quantity}
      )
    `;
  }

  return { order, items };
}

export async function getOrder(orderId) {
  const sql = await getSql();
  if (!sql) {
    const order = memory.orders.get(orderId);
    if (!order) return null;
    return {
      order,
      items: memory.orderItems.get(orderId) || [],
      payment: memory.payments.get(orderId) || null,
    };
  }

  await ensureSchema(sql);
  const [orderRow] = await sql`
    SELECT id, status, customer_name, customer_phone, customer_email, postal_code, address1,
           address2, memo, subtotal, shipping, total, tracking_number, created_at, updated_at
    FROM orders
    WHERE id = ${orderId}
  `;

  if (!orderRow) return null;

  const itemRows = await sql`
    SELECT product_id, slug, name, image, price, quantity
    FROM order_items
    WHERE order_id = ${orderId}
    ORDER BY name
  `;
  const [paymentRow] = await sql`
    SELECT id, payment_key, amount, status, raw_payload
    FROM payments
    WHERE order_id = ${orderId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return {
    order: mapOrderRow(orderRow),
    items: itemRows.map(mapOrderItemRow),
    payment: paymentRow ? mapPaymentRow(paymentRow) : null,
  };
}

export async function listOrders() {
  const sql = await getSql();
  if (!sql) {
    return [...memory.orders.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        order,
        items: memory.orderItems.get(order.id) || [],
        payment: memory.payments.get(order.id) || null,
      }));
  }

  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, status, customer_name, customer_phone, customer_email, postal_code, address1,
           address2, memo, subtotal, shipping, total, tracking_number, created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
  `;

  const orders = [];
  for (const row of rows) {
    const detail = await getOrder(row.id);
    if (detail) orders.push(detail);
  }
  return orders;
}

export async function markOrderPaid({ orderId, paymentKey, amount, rawPayload }) {
  const detail = await getOrder(orderId);
  if (!detail) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }
  if (detail.order.status === "paid") return detail;
  if (!canTransitionOrder(detail.order.status, "paid")) {
    const error = new Error(`Cannot mark ${detail.order.status} order as paid`);
    error.statusCode = 409;
    throw error;
  }

  const sql = await getSql();
  if (!sql) {
    const stock = new Map(memory.products.map((product) => [product.id, product.stock]));
    const nextStock = decrementStock(stock, detail.items);
    memory.products = memory.products.map((product) => ({
      ...product,
      stock: nextStock.has(product.id) ? nextStock.get(product.id) : product.stock,
    }));
    const paidOrder = { ...detail.order, status: "paid" };
    const payment = {
      id: randomUUID(),
      provider: "toss",
      paymentKey,
      amount,
      status: "DONE",
      rawPayload,
    };
    memory.orders.set(orderId, paidOrder);
    memory.payments.set(orderId, payment);
    return { order: paidOrder, items: detail.items, payment };
  }

  await ensureSchema(sql);
  await sql`UPDATE orders SET status = 'paid', updated_at = NOW() WHERE id = ${orderId}`;
  for (const item of detail.items) {
    await sql`
      UPDATE products
      SET stock = GREATEST(stock - ${item.quantity}, 0), updated_at = NOW()
      WHERE id = ${item.productId}
    `;
  }
  await sql`
    INSERT INTO payments (id, order_id, provider, payment_key, amount, status, raw_payload)
    VALUES (${randomUUID()}, ${orderId}, 'toss', ${paymentKey}, ${amount}, 'DONE', ${JSON.stringify(rawPayload)})
  `;

  return getOrder(orderId);
}

export async function updateOrder({ orderId, status, trackingNumber }) {
  const detail = await getOrder(orderId);
  if (!detail) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }
  if (status && status !== detail.order.status && !canTransitionOrder(detail.order.status, status)) {
    const error = new Error(`Cannot change order from ${detail.order.status} to ${status}`);
    error.statusCode = 409;
    throw error;
  }

  const nextOrder = {
    ...detail.order,
    status: status || detail.order.status,
    trackingNumber: trackingNumber ?? detail.order.trackingNumber,
  };

  const sql = await getSql();
  if (!sql) {
    memory.orders.set(orderId, nextOrder);
    return { ...detail, order: nextOrder };
  }

  await ensureSchema(sql);
  await sql`
    UPDATE orders
    SET status = ${nextOrder.status}, tracking_number = ${nextOrder.trackingNumber || null}, updated_at = NOW()
    WHERE id = ${orderId}
  `;
  return getOrder(orderId);
}

export async function recordRefund({ orderId, amount, reason, rawPayload }) {
  const detail = await getOrder(orderId);
  if (!detail) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const sql = await getSql();
  if (!sql) {
    const nextOrder = { ...detail.order, status: "refunded" };
    const refund = {
      id: randomUUID(),
      orderId,
      paymentId: detail.payment?.id || null,
      amount,
      reason,
      rawPayload,
    };
    memory.orders.set(orderId, nextOrder);
    memory.refunds.push(refund);
    return { ...detail, order: nextOrder, refund };
  }

  await ensureSchema(sql);
  await sql`UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = ${orderId}`;
  await sql`
    INSERT INTO refunds (id, order_id, payment_id, amount, reason, raw_payload)
    VALUES (
      ${randomUUID()}, ${orderId}, ${detail.payment?.id || null}, ${amount}, ${reason},
      ${JSON.stringify(rawPayload)}
    )
  `;
  return getOrder(orderId);
}

async function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (sqlClient) return sqlClient;

  const { neon } = await import("@neondatabase/serverless");
  sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function ensureSchema(sql) {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      collection TEXT NOT NULL,
      line TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      badge TEXT,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      material TEXT,
      fit TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      postal_code TEXT,
      address1 TEXT NOT NULL,
      address2 TEXT,
      memo TEXT,
      subtotal INTEGER NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      tracking_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'toss',
      payment_key TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payment_id TEXT,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaReady = true;
}

function normalizeProduct(input) {
  const name = required(input.name, "product name");
  const slug = String(input.slug || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    id: String(input.id || `nf-${randomUUID().slice(0, 8)}`),
    slug,
    name,
    category: required(input.category, "category"),
    collection: required(input.collection, "collection"),
    line: String(input.line || input.collection || "").trim(),
    price: Math.max(0, Math.floor(Number(input.price) || 0)),
    stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
    visible: input.visible !== false && input.visible !== "false",
    badge: String(input.badge || "").trim(),
    image: required(input.image, "image path"),
    description: required(input.description, "description"),
    material: String(input.material || "").trim(),
    fit: String(input.fit || "").trim(),
  };
}

function required(value, label) {
  const clean = String(value || "").trim();
  if (!clean) {
    const error = new Error(`${label} is required`);
    error.statusCode = 400;
    throw error;
  }
  return clean;
}

function mapProductRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    collection: row.collection,
    line: row.line,
    price: row.price,
    stock: row.stock,
    visible: row.visible,
    badge: row.badge || "",
    image: row.image,
    description: row.description,
    material: row.material || "",
    fit: row.fit || "",
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || "",
    postalCode: row.postal_code || "",
    address1: row.address1,
    address2: row.address2 || "",
    memo: row.memo || "",
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    trackingNumber: row.tracking_number || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItemRow(row) {
  return {
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    image: row.image,
    price: row.price,
    quantity: row.quantity,
  };
}

function mapPaymentRow(row) {
  return {
    id: row.id,
    paymentKey: row.payment_key,
    amount: row.amount,
    status: row.status,
    rawPayload: row.raw_payload,
  };
}
