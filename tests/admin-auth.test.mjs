import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAdminSessionToken,
  safeEqual,
  verifyAdminSessionToken,
} from "../src/lib/admin-auth.mjs";

test("safeEqual compares secrets without accepting different lengths", () => {
  assert.equal(safeEqual("secret", "secret"), true);
  assert.equal(safeEqual("secret", "Secret"), false);
  assert.equal(safeEqual("secret", "secret-longer"), false);
});

test("creates and verifies an HMAC signed admin session token", () => {
  const now = 1770000000000;
  const token = createAdminSessionToken({
    username: "admin",
    secret: "session-secret",
    now,
    ttlMs: 60_000,
  });

  assert.equal(
    verifyAdminSessionToken({
      token,
      secret: "session-secret",
      now: now + 10_000,
    }).username,
    "admin",
  );

  assert.equal(
    verifyAdminSessionToken({
      token,
      secret: "different-secret",
      now: now + 10_000,
    }),
    null,
  );

  assert.equal(
    verifyAdminSessionToken({
      token,
      secret: "session-secret",
      now: now + 120_000,
    }),
    null,
  );
});
