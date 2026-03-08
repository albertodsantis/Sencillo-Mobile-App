# Vercel Deployment

This project deploys to Vercel as a static Expo web export.

## Build settings

- Install command: `npm install`
- Build command: `npm run vercel-build`
- Output directory: `web-build`

These are already defined in `vercel.json`.

## Required environment variables

Set these in the Vercel project before the first production deployment:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `EXPO_PUBLIC_API_PORT`

## Local verification

Run:

```bash
npm run build:web
```

If the export succeeds, the generated site is ready for Vercel to publish from `web-build/`.
