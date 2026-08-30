# ADR-005 — Identity provider boundary

**Status:** Accepted

## Decision
Repassing owns its `User` and authorization model. External authentication is accessed through an `IdentityProvider` port. Provider identities map to users through `IdentityAccount` records.

## Why
A global marketplace must be able to change or combine authentication mechanisms without coupling domain logic, organization membership, orders or payments to one vendor.

## Consequences
- Authentication vendor SDKs stay in infrastructure adapters.
- Server-side authorization uses Repassing membership/role data.
- Preview identity is allowed only as an explicit development/pilot shell until production auth is connected.
