import { buildTossAuthorizationHeader } from "../../src/lib/payment-provider.mjs";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey || paymentKey === "local-demo") {
    return {
      provider: "toss",
      paymentKey,
      orderId,
      totalAmount: amount,
      status: "DONE",
      localDemo: true,
    };
  }

  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: buildTossAuthorizationHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || "Toss payment confirmation failed");
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function cancelTossPayment({ paymentKey, reason }) {
  const secretKey = process.env.TOSS_SECRET_KEY;

  if (!secretKey || paymentKey === "local-demo") {
    return {
      paymentKey,
      status: "CANCELED",
      cancelReason: reason,
      localDemo: true,
    };
  }

  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: buildTossAuthorizationHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelReason: reason }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || "Toss payment cancellation failed");
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
