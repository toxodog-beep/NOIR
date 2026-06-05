import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCartTotals,
  canTransitionOrder,
  decrementStock,
  normalizeCartItems,
} from "../src/lib/commerce.mjs";

test("calculates Korean shipping fee and free shipping threshold", () => {
  const items = [
    { productId: "nf-001", price: 68000, quantity: 1 },
    { productId: "nf-002", price: 42000, quantity: 1 },
  ];

  assert.deepEqual(calculateCartTotals(items), {
    subtotal: 110000,
    shipping: 0,
    total: 110000,
  });

  assert.deepEqual(calculateCartTotals([{ productId: "nf-003", price: 79000, quantity: 1 }]), {
    subtotal: 79000,
    shipping: 3000,
    total: 82000,
  });
});

test("normalizes cart items by dropping invalid quantities and merging duplicates", () => {
  const normalized = normalizeCartItems([
    { productId: "nf-001", quantity: 1 },
    { productId: "nf-001", quantity: 3 },
    { productId: "nf-002", quantity: 0 },
    { productId: "nf-003", quantity: -2 },
    { productId: "nf-004", quantity: 1.8 },
  ]);

  assert.deepEqual(normalized, [
    { productId: "nf-001", quantity: 4 },
    { productId: "nf-004", quantity: 1 },
  ]);
});

test("decrements stock and rejects oversell attempts", () => {
  const stock = new Map([
    ["nf-001", 3],
    ["nf-002", 1],
  ]);

  assert.deepEqual(
    decrementStock(stock, [
      { productId: "nf-001", quantity: 2 },
      { productId: "nf-002", quantity: 1 },
    ]),
    new Map([
      ["nf-001", 1],
      ["nf-002", 0],
    ]),
  );

  assert.throws(
    () => decrementStock(stock, [{ productId: "nf-001", quantity: 4 }]),
    /Insufficient stock/,
  );
});

test("allows only explicit order status transitions", () => {
  assert.equal(canTransitionOrder("pending", "paid"), true);
  assert.equal(canTransitionOrder("paid", "preparing"), true);
  assert.equal(canTransitionOrder("preparing", "shipped"), true);
  assert.equal(canTransitionOrder("shipped", "delivered"), true);
  assert.equal(canTransitionOrder("paid", "refunded"), true);
  assert.equal(canTransitionOrder("delivered", "pending"), false);
  assert.equal(canTransitionOrder("canceled", "paid"), false);
});
