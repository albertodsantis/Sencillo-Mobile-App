# Crash Reporting

## Runtime setup

- Sentry initializes from `index.js` through `lib/monitoring/sentry.ts`.
- Production events are only sent when `EXPO_PUBLIC_SENTRY_DSN` is set and the app is not running in `__DEV__`.
- The app syncs the current user, route and active workspace into Sentry from `app/_layout.tsx`.
- Root React render failures are captured through the existing `ErrorBoundary`.

## Required environment variables

- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT`
- `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`

## Sourcemaps for release builds

If you build with EAS and want readable stack traces, set these secrets in your release environment:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_URL` if you use self-hosted Sentry

If you export bundles or OTA updates manually, generate source maps and upload them after the export:

```bash
npx expo export --platform ios --platform android --output-dir dist --source-maps
npm run sentry:upload-sourcemaps
```

## Release verification

- Force a handled error in a preview build and confirm it reaches Sentry.
- Force a native crash only in a non-production test build if you want to verify native crash capture.
- Confirm the event contains `route`, `workspace` and authenticated user context.
- Confirm stack traces are symbolicated after uploading source maps.
