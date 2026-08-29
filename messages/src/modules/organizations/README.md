# Organizations domain

Organizations is the tenancy backbone for Repassing.

The model supports federation → region → club → section plus teams, without requiring every deployment to use every level. Membership and role are scoped to an organization; team memberships are separate. Marketplace records reference stable UUIDs, never URLs or `.se` assumptions.
