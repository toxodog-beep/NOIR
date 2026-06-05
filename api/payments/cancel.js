import { assertMethod, readJson, sendError, sendJson } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin.js";
import { cancelTossPayment } from "../_lib/toss.js";
import { getOrder, recordRefund } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["POST"]);
    requireAdmin(req);

    const body = await readJson(req);
    const detail = await getOrder(body.orderId);
    if (!detail) return sendJson(res, 404, { error: "Order not found" });
    if (!detail.payment?.paymentKey) {
      return sendJson(res, 409, { error: "No payment found for this order" });
    }

    const reason = String(body.reason || "관리자 전체 취소").trim();
    const cancelPayload = await cancelTossPayment({
      paymentKey: detail.payment.paymentKey,
      reason,
    });
    const refunded = await recordRefund({
      orderId: detail.order.id,
      amount: detail.order.total,
      reason,
      rawPayload: cancelPayload,
    });

    sendJson(res, 200, refunded);
  } catch (error) {
    sendError(res, error);
  }
}
