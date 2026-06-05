import {
  createAdminSessionToken,
  safeEqual,
  verifyAdminSessionToken,
} from "../../src/lib/admin-auth.mjs";
import { getCookie } from "./http.js";

const COOKIE_NAME = "nf_admin";

export function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "noir-admin",
    sessionSecret: process.env.ADMIN_SESSION_SECRET || "local-noir-frame-session-secret",
  };
}

export function createAdminCookie(username) {
  const { sessionSecret } = getAdminConfig();
  const token = createAdminSessionToken({ username, secret: sessionSecret });
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function validateAdminPassword({ username, password }) {
  const config = getAdminConfig();
  return safeEqual(username, config.username) && safeEqual(password, config.password);
}

export function getAdminSession(req) {
  const token = getCookie(req, COOKIE_NAME);
  const { sessionSecret } = getAdminConfig();
  return verifyAdminSessionToken({ token, secret: sessionSecret });
}

export function requireAdmin(req) {
  const session = getAdminSession(req);
  if (!session) {
    const error = new Error("Admin login required");
    error.statusCode = 401;
    throw error;
  }
  return session;
}
