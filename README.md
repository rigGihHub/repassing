# Repassing v0.1.1 — UI Foundation + Scalable Architecture

**Play more. Waste less.**

This release polishes the first marketplace shell and establishes the architectural boundaries intended to carry Repassing from a Swedish pilot to an international marketplace.

## What changed
- Larger, clearer brand/header treatment
- More marketplace-like desktop and mobile layout
- Club context and quick filters
- Real product illustration placeholders instead of emoji cards
- Sustainability signal without turning the UI into an environmental dashboard
- Modular-monolith domain skeleton under `src/modules`
- Shared platform config and money value object
- Expanded PostgreSQL/Prisma marketplace core: organizations, teams, listings, orders, payments, fees and fulfillment
- Architecture and ADR documentation for scale, money/order invariants and provider abstraction

## Run locally
```bash
npm.cmd install
npm.cmd run dev
```
Then open `http://localhost:3000`.

## Validation
```bash
npm.cmd run typecheck
npm.cmd run build
```

## Version
0.1.1
