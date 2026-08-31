# Repassing v0.5.3.3 — Vercel build fix

- Fixes the exact TypeScript error reported by Vercel in `app/[locale]/page.tsx`.
- Mock listing cards no longer depend on an `image` property during the production fallback render.
- Mock prices now use the actual `Money` shape: `price.amountMinor` and `price.currency`.
- Keeps the production resilience/fallback changes from v0.5.3.2.
- Removes generated `tsconfig.tsbuildinfo` from the replacement package.
