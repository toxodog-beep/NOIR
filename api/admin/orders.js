import { requireAdmin } from "../_lib/admin.js";
import { assertMethod, readJson, sendError, sendJson } from "../_lib/http.js";
import { listOrders, updateOrder } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET", "PATCH"]);
    requireAdmin(req);

    if (req.method === "GET") {
      return sendJson(res, 200, { orders: await listOrders() });
    }

    const body = await readJson(req);
    const detail = await updateOrder({
      orderId: body.orderId,
      status: body.status,
      trackingNumber: body.trackingNumber,
    });
    sendJson(res, 200, detail);
  } catch (error) {
    sendError(res, error);
  }
}
