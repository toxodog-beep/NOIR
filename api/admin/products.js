import { requireAdmin } from "../_lib/admin.js";
import { assertMethod, readJson, sendError, sendJson } from "../_lib/http.js";
import { listProducts, saveProduct } from "../_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET", "POST", "PUT"]);
    requireAdmin(req);

    if (req.method === "GET") {
      return sendJson(res, 200, { products: await listProducts({ includeHidden: true }) });
    }

    const body = await readJson(req);
    const product = await saveProduct(body.product || body);
    sendJson(res, 200, { product });
  } catch (error) {
    sendError(res, error);
  }
}
