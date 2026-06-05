import { clearAdminCookie, createAdminCookie, getAdminSession, validateAdminPassword } from "../_lib/admin.js";
import { assertMethod, readJson, sendError, sendJson } from "../_lib/http.js";

export default async function handler(req, res) {
  try {
    assertMethod(req, ["GET", "POST", "DELETE"]);

    if (req.method === "GET") {
      const session = getAdminSession(req);
      return sendJson(res, 200, { authenticated: Boolean(session), session });
    }

    if (req.method === "DELETE") {
      return sendJson(res, 200, { ok: true }, { "Set-Cookie": clearAdminCookie() });
    }

    const body = await readJson(req);
    if (!validateAdminPassword({ username: body.username, password: body.password })) {
      return sendJson(res, 401, { error: "Invalid admin credentials" });
    }

    sendJson(
      res,
      200,
      { authenticated: true, username: body.username },
      { "Set-Cookie": createAdminCookie(body.username) },
    );
  } catch (error) {
    sendError(res, error);
  }
}
