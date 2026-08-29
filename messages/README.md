# Repassing v0.2.0 — Identity & Organizations Foundation

**Play more. Waste less.**

This release turns the v0.1 marketplace shell into the first real platform foundation for identity, multi-club membership and international organization tenancy.

## What is included
- Identity domain with a vendor-neutral `IdentityProvider` port
- Explicit preview identity adapter so the public shell still runs without auth credentials
- Organization tenancy model for federation → region → club → section
- Organization and team membership roles/statuses
- `/sv/profile` and `/sv/clubs` platform views
- Versioned API contracts: `/api/v1/session` and `/api/v1/organizations`
- Expanded Prisma schema for identity accounts, invitations, hierarchy, roles and auditability
- ADRs for identity-provider independence and organization tenancy
- Explicit dependency versions and CI quality gates

## Important
Preview identity is **not** production login. It is deliberately isolated behind the same interface a managed production provider will implement. This lets us test the platform now without hard-coding a vendor or pretending authentication is finished.

## Run locally on Windows
```powershell
npm.cmd install
npm.cmd run dev
```
Open `http://localhost:3000`.

## Validation
```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Deployment
Push `main` to GitHub. Vercel deploys automatically. Production domain: `https://repassing.se` once DNS propagation is complete. Temporary Vercel URL: `https://repassing.vercel.app`.

## Version
0.2.0
