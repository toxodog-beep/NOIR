import { createCheckoutPayload } from "../src/lib/payment-provider.mjs";
import { assertMethod, getOrigin, readJson, sendError, sendJson } from "./_lib/http.js";
import { createOrder, getOrder, listOrders } from "./_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET", "POST"]);

    if (req.method === "POST") {
      const body = await readJson(req);
      const { order, items } = await createOrder({
        cartItems: body.items,
        customer: body.customer,
      });
      const checkout = createCheckoutPayload({
        origin: getOrigin(req),
        orderId: order.id,
        orderName: order.orderName,
        amount: order.total,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerMobilePhone: order.customerPhone.replace(/\D/g, ""),
      });

      return sendJson(res, 201, { order, items, checkout });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const orderId = url.searchParams.get("orderId");
    if (orderId) {
      const detail = await getOrder(orderId);
      if (!detail) return sendJson(res, 404, { error: "Order not found" });
      return sendJson(res, 200, detail);
    }

    const orders = await listOrders();
    sendJson(res, 200, { orders });
  } catch (error) {
    sendError(res, error);
  }
}
