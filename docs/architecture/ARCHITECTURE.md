# Repassing Architecture v0.1.1

## Goal
Build a Sweden-first product without creating Sweden-only architecture. Repassing should be able to grow from one club to many countries without a platform rewrite.

## Shape: modular monolith
One deployable application, explicit bounded contexts, one primary PostgreSQL database, provider abstractions at external boundaries. This maximizes speed now while preserving a clean path to services later.

## Domain boundaries
- Identity — accounts, sessions, user profile
- Organizations — clubs, teams, memberships, tenant permissions
- Marketplace — catalog, listings, search, favorites
- Orders — order lifecycle and concurrency ownership
- Payments — provider adapter, payment state, refunds, payouts
- Fulfillment — handover now, shipping later
- Messaging — order/listing conversations and notifications
- Sustainability — impact facts and methodology-backed metrics
- Administration — global operations, moderation, audit

## Non-negotiables
1. UI never owns business rules.
2. Authorization is checked server-side.
3. Organization context is explicit on tenant-owned records.
4. Money is integer minor units + currency.
5. IDs are globally safe UUIDs.
6. Payment and fulfillment are separate from orders.
7. Payment provider logic sits behind an adapter boundary.
8. User-facing copy is locale-aware.
9. Country, currency and organization identity are not tied to repassing.se.
10. Events/auditability are designed in before scale.

## Scale path
Stage 1: Next.js modular monolith + PostgreSQL.
Stage 2: introduce queues/workers for images, email, notifications, webhooks.
Stage 3: add dedicated search/indexing when PostgreSQL search no longer meets product needs.
Stage 4: split only demonstrated hot domains (likely search, notifications, payments/webhooks) into independent services.

## Data strategy
Prefer transactional consistency in PostgreSQL for marketplace invariants: a listing can only be sold once, order state transitions are controlled, and payment webhooks are idempotent. Use an outbox/event mechanism when async processing is introduced.

## International readiness
Locale, currency, country and timezone are data. Organization and user IDs are domain identifiers, never domain-name-derived. Routes can change from repassing.se to repassing.com or country domains without data migration.
