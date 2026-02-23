# Google OAuth setup for Expo (Supabase)

Use these values in **Supabase Auth > URL Configuration** for this app:

- **Site URL**: `sencillo://auth/callback`
- **Redirect URLs**:
  - `sencillo://auth/callback`
  - `exp://127.0.0.1:8081/--/auth/callback` (optional for local Expo Go)
  - `exp://*/--/auth/callback` (optional wildcard for Expo Go)

## Why

The app now uses a fixed redirect URI for Google OAuth:

- `sencillo://auth/callback`

If this URI is not allowlisted in Supabase, Google login will fail after provider selection.

## Google Cloud Console

In your Google OAuth client used by Supabase, keep the authorized redirect URI provided by Supabase:

- `https://uwbggqqhupcmlwmrcrpn.supabase.co/auth/v1/callback`

You do **not** set `exp://...` or `sencillo://...` in Google Cloud. Those are configured in Supabase only.
