# Identity & tenancy architecture — v0.2

## Goal
Repassing must support one pilot club today and an international, multi-sport marketplace later without changing the identity of users, organizations or transactions.

## Identity
Authentication is an infrastructure concern. Repassing owns the user record, memberships and authorization decisions. External provider subjects are mapped through `IdentityAccount`.

No child account is required for the core marketplace. A parent/guardian can be the user and transaction party while team context remains organizational metadata.

## Tenancy
`Organization` is the tenant boundary. It can represent federation, region, club or section and can point to a parent organization. `Team` belongs to an organization and is intentionally not a tenant root.

Authorization is scoped through `OrganizationMembership`; team permissions are separate through `TeamMembership`.

## International defaults
Country, locale, timezone and currency are explicit data fields. UUIDs are internal identifiers. Slugs are public navigation identifiers and never used as foreign keys.

## API boundary
New server endpoints are versioned under `/api/v1`. UI components call application services/domain contracts rather than reaching directly into provider SDKs.

## Preview mode
v0.2 includes a preview identity and preview organization repository so the application can be deployed without credentials or a database. These adapters are clearly isolated under `infrastructure/` and are replaceable; they are not production authentication or persistence.
