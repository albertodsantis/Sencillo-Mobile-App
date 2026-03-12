import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";

const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const appVersion = Constants.expoConfig?.version ?? "unknown";
const environment =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
  (isDevelopment ? "development" : "production");

function parseSampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

const tracesSampleRate = parseSampleRate(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  isDevelopment ? 1 : 0.1,
);

const isCrashReportingEnabled = Boolean(dsn) && !isDevelopment;

if (isCrashReportingEnabled) {
  Sentry.init({
    dsn,
    enabled: true,
    debug: false,
    environment,
    release: `sencillo@${appVersion}`,
    tracesSampleRate,
    attachStacktrace: true,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    initialScope: {
      tags: {
        platform: Platform.OS,
        runtime: Constants.executionEnvironment ?? "unknown",
      },
      contexts: {
        app: {
          version: appVersion,
        },
      },
    },
  });
}

export function captureErrorBoundaryException(
  error: Error,
  componentStack: string,
) {
  Sentry.withScope((scope) => {
    scope.setLevel("fatal");
    scope.setContext("react_error_boundary", { componentStack });
    Sentry.captureException(error);
  });
}

export { Sentry, isCrashReportingEnabled };
