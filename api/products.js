import { assertMethod, sendError, sendJson } from "./_lib/http.js";
import { findProductBySlug, listProducts } from "./_lib/store.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET"]);

    const url = new URL(req.url, `http://${req.headers.host}`);
    const slug = url.searchParams.get("slug");
    const products = await listProducts();

    if (slug) {
      const product = await findProductBySlug(slug);
      if (!product || product.visible === false) {
        return sendJson(res, 404, { error: "Product not found" });
      }
      return sendJson(res, 200, { product });
    }

    sendJson(res, 200, { products });
  } catch (error) {
    sendError(res, error);
  }
}
