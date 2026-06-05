export async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(res, statusCode, payload, headers = {}) {
  res.statusCode = statusCode;
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function sendError(res, error) {
  sendJson(res, error.statusCode || 500, {
    error: error.message || "Unexpected server error",
  });
}

export function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
  return cookies[name] || "";
}

export function assertMethod(req, allowed) {
  if (!allowed.includes(req.method)) {
    const error = new Error(`Method ${req.method} is not allowed`);
    error.statusCode = 405;
    throw error;
  }
}
