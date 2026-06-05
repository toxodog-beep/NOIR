import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTossAuthorizationHeader,
  createCheckoutPayload,
  verifyTossReturnParams,
} from "../src/lib/payment-provider.mjs";

test("builds Toss Basic authorization header from the secret key", () => {
  assert.equal(
    buildTossAuthorizationHeader("test_sk_123"),
    `Basic ${Buffer.from("test_sk_123:").toString("base64")}`,
  );
});

test("creates a mobile Toss checkout payload with verified amount and return urls", () => {
  const payload = createCheckoutPayload({
    origin: "https://noir-frame.vercel.app",
    orderId: "order_123",
    orderName: "NOIR FRAME 2 items",
    amount: 82000,
    customerName: "Kim Noir",
    customerEmail: "buyer@example.com",
    customerMobilePhone: "01012345678",
  });

  assert.equal(payload.method, "카드");
  assert.equal(payload.amount, 82000);
  assert.equal(payload.orderId, "order_123");
  assert.equal(payload.successUrl, "https://noir-frame.vercel.app/success");
  assert.equal(payload.failUrl, "https://noir-frame.vercel.app/fail");
  assert.equal(payload.customerName, "Kim Noir");
});

test("verifies Toss return params against the server-side expected amount", () => {
  assert.deepEqual(
    verifyTossReturnParams({
      paymentKey: "payment_abc",
      orderId: "order_abc",
      amount: "82000",
      expectedAmount: 82000,
    }),
    { paymentKey: "payment_abc", orderId: "order_abc", amount: 82000 },
  );

  assert.throws(
    () =>
      verifyTossReturnParams({
        paymentKey: "payment_abc",
        orderId: "order_abc",
        amount: "100",
        expectedAmount: 82000,
      }),
    /Payment amount mismatch/,
  );
});
