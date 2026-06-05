import { assertMethod, sendError, sendJson } from "../_lib/http.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET"]);
    const clientKey = process.env.TOSS_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";

    sendJson(res, 200, {
      provider: "toss",
      clientKey,
      enabled: Boolean(clientKey),
      mode: clientKey ? "toss" : "local-demo",
    });
  } catch (error) {
    sendError(res, error);
  }
}
