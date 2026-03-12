const SECURE_STORE_KEY_PREFIX = "Sencillo";

export function toSecureStoreKey(key: string): string {
  const encodedKey = Array.from(key)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

  return `${SECURE_STORE_KEY_PREFIX}${encodedKey}`;
}
