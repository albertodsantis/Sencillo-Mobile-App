# Google OAuth setup for Expo (Supabase)

Use these values in **Supabase Auth > URL Configuration** for this app:

- **Site URL**: `https://uwbggqqhupcmlwmrcrpn.supabase.co`
- **Redirect URLs** (allowlist all):
  - `sencillo://auth/callback` (native/dev build)
  - `exp://*/--/auth/callback` (Expo Go)
  - `exp://127.0.0.1:8081/--/auth/callback` (optional local Expo Go explicit)

## Why

The app now builds redirect URLs with:

- `path: auth/callback`
- `native: sencillo://auth/callback`

This means:

- In **Expo Go**, the redirect is `exp://.../--/auth/callback`.
- In **native builds** (or custom dev client), the redirect is `sencillo://auth/callback`.

If these URLs are not allowlisted in Supabase, Google login can fail after provider selection or show an invalid-address error.

## Google Cloud Console

In your Google OAuth client used by Supabase, keep the authorized redirect URI provided by Supabase:

- `https://uwbggqqhupcmlwmrcrpn.supabase.co/auth/v1/callback`

Do **not** add `exp://...` or `sencillo://...` in Google Cloud; those belong in Supabase URL Configuration.
