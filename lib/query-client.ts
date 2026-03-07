import { fetch } from "expo/fetch";
import Constants from "expo-constants";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function normalizeBaseUrl(
  value: string,
  defaultProtocol: "http" | "https",
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("API base URL is empty");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${defaultProtocol}://${trimmed}`;

  return ensureTrailingSlash(new URL(withProtocol).toString());
}

function resolveFromExpoHostUri(): string | null {
  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string | null };
    manifest2?: {
      extra?: { expoGo?: { debuggerHost?: string | null } };
    };
  };

  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0];
  const port = process.env.EXPO_PUBLIC_API_PORT || "5000";
  return `http://${host}:${port}/`;
}

/**
 * Gets the base URL for the Express API server.
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL, "http");
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return normalizeBaseUrl(process.env.EXPO_PUBLIC_DOMAIN, "https");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return ensureTrailingSlash(window.location.origin);
  }

  const expoHostUrl = resolveFromExpoHostUri();
  if (expoHostUrl) {
    return expoHostUrl;
  }

  return "http://localhost:5000/";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
