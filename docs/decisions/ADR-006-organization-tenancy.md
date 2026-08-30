# ADR-006 — Organization tenancy and hierarchy

**Status:** Accepted

## Decision
`Organization` is the tenancy root and uses UUID identity, unique slug, explicit country/currency/locale and an optional self-referencing parent. Teams belong to organizations but are not tenancy roots.

## Why
The same architecture must support a single Swedish club today and federations, regions, sections and international clubs later.

## Consequences
- Authorization is scoped by organization membership.
- Public URLs use slugs; foreign keys use UUIDs.
- Country, locale and currency are data, not assumptions baked into IDs or routes.
