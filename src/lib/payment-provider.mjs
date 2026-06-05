export function buildTossAuthorizationHeader(secretKey) {
  if (!secretKey) throw new Error("Toss secret key is required");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export function createCheckoutPayload({
  origin,
  orderId,
  orderName,
  amount,
  customerName,
  customerEmail,
  customerMobilePhone,
}) {
  const cleanOrigin = String(origin || "").replace(/\/$/, "");
  const numericAmount = Math.floor(Number(amount));

  if (!cleanOrigin) throw new Error("Checkout origin is required");
  if (!orderId) throw new Error("Checkout orderId is required");
  if (!orderName) throw new Error("Checkout orderName is required");
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Checkout amount must be positive");
  }

  return {
    method: "카드",
    amount: numericAmount,
    orderId,
    orderName,
    customerName,
    customerEmail,
    customerMobilePhone,
    successUrl: `${cleanOrigin}/success`,
    failUrl: `${cleanOrigin}/fail`,
  };
}

export function verifyTossReturnParams({ paymentKey, orderId, amount, expectedAmount }) {
  const numericAmount = Math.floor(Number(amount));
  const numericExpected = Math.floor(Number(expectedAmount));

  if (!paymentKey) throw new Error("Missing paymentKey");
  if (!orderId) throw new Error("Missing orderId");
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid payment amount");
  }
  if (numericAmount !== numericExpected) {
    throw new Error("Payment amount mismatch");
  }

  return {
    paymentKey,
    orderId,
    amount: numericAmount,
  };
}
