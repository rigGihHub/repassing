# Repassing v0.2.0

## Identity & Organizations Foundation

- Added vendor-neutral identity boundary and session contract.
- Added explicit preview identity adapter for credential-free deployments.
- Added international organization tenancy with federation/region/club/section hierarchy.
- Added organization/team roles, status and invitation model.
- Added profile, organization list and organization workspace UI.
- Added versioned session and organization API endpoints.
- Expanded Prisma schema for identity accounts, hierarchy and membership lifecycle.
- Added architecture decisions for identity portability and multi-tenant organization design.
- Upgraded Next.js package target to 15.5.24 and added Node engine range.

## Not yet production-ready
Production authentication, database persistence and authorization enforcement are deliberately not represented as complete in this release. They are the next integration layer on top of the contracts established here.
