import { verifyTossReturnParams } from "../../src/lib/payment-provider.mjs";
import { assertMethod, readJson, sendError, sendJson } from "../_lib/http.js";
import { confirmTossPayment } from "../_lib/toss.js";
import { getOrder, markOrderPaid } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["POST"]);
    const body = await readJson(req);
    const detail = await getOrder(body.orderId);
    if (!detail) return sendJson(res, 404, { error: "Order not found" });

    const params = verifyTossReturnParams({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
      expectedAmount: detail.order.total,
    });
    const tossPayload = await confirmTossPayment(params);
    const paid = await markOrderPaid({
      orderId: params.orderId,
      paymentKey: params.paymentKey,
      amount: params.amount,
      rawPayload: tossPayload,
    });

    sendJson(res, 200, paid);
  } catch (error) {
    sendError(res, error);
  }
}
