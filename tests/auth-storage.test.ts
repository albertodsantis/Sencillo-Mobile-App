import test from "node:test";
import assert from "node:assert/strict";
import { toSecureStoreKey } from "../lib/auth/secureStoreKey";

const AUTH_USER_CACHE_KEY = "@sencillo/auth_user";
const SUPABASE_AUTH_STORAGE_KEY = "@sencillo/supabase.auth.token";

test("toSecureStoreKey returns an alphanumeric key for secure store", () => {
  const transformed = toSecureStoreKey(SUPABASE_AUTH_STORAGE_KEY);

  assert.match(transformed, /^[a-z0-9]+$/i);
  assert.ok(transformed.startsWith("Sencillo"));
});

test("toSecureStoreKey is deterministic and avoids collisions for common auth keys", () => {
  const sessionKey = toSecureStoreKey(SUPABASE_AUTH_STORAGE_KEY);
  const userKey = toSecureStoreKey(AUTH_USER_CACHE_KEY);

  assert.equal(sessionKey, toSecureStoreKey(SUPABASE_AUTH_STORAGE_KEY));
  assert.notEqual(sessionKey, userKey);
});
