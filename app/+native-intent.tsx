function normalizeSystemPath(path: string): string {
  if (!path) return "/";

  try {
    const url = new URL(path);
    const isHttpUrl = url.protocol === "http:" || url.protocol === "https:";
    const routePath = isHttpUrl
      ? url.pathname
      : `${url.host ? `/${url.host}` : ""}${url.pathname}`;
    const normalizedRoute = routePath || "/";
    return `${normalizedRoute}${url.search}${url.hash}`;
  } catch {
    return path.startsWith("/") ? path : `/${path}`;
  }
}

export function redirectSystemPath({
  path,
}: { path: string; initial: boolean }) {
  const normalizedPath = normalizeSystemPath(path);

  if (normalizedPath.startsWith("/auth/callback")) {
    return "/";
  }

  return normalizedPath;
}
