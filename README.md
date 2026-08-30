# Repassing v0.4.0

International-ready circular sports marketplace foundation.

## Production runtime

The app now supports live Supabase Auth + Row Level Security backed application data without exposing a database password or service-role key to the web application.

Required environment variables are documented in `.env.example` and `docs/architecture/LIVE_AUTH_AND_APP_CONNECTION.md`.

## Local start

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run build
```
