# Repassing v0.6.0 — Pilot-ready club platform

This release turns the existing organization foundation into a usable first pilot surface.

## Added
- Club pilot application flow for signed-in users.
- Invite-code based member onboarding.
- Club-admin dashboard for OWNER/ADMIN memberships.
- Club settings for marketplace, local handoff, messaging, public contact email and website.
- Team creation from the club-admin dashboard.
- Public club marketplace at `/[locale]/clubs/[slug]` with active listings and pilot metrics.
- Pilot KPI cards: active listings, completed trades, connected families and reused items.
- Existing onboarding checklist surfaced in club admin.
- `organization_invites` database table, deliberately server/service-role only.

## Security
- All club mutations authenticate server-side.
- Admin mutations verify OWNER/ADMIN membership before service-role writes.
- Invite codes never expose their backing table to anon/authenticated Data API roles.
- No destructive database changes.

## Known limitations
- Pilot application approval remains an operational/admin step; a dedicated Repassing super-admin UI is not included yet.
- Invite redemption currently joins at organization level; team-specific invite targeting is a follow-up.
- Sustainability savings are not estimated in the UI until a defensible calculation model is chosen.

## v0.6.1 – Pilot onboarding & club admin 2.0
- Added a platform-admin review queue for club applications.
- Approval now creates the organization, first OWNER membership, organization settings and onboarding checklist automatically.
- Applications retain the created organization id and decision note for traceability.
- Club invitation codes can optionally target a specific team.
- Joining with a team-scoped code creates both club and team membership.
- Platform-admin access is explicitly allowlisted through `REPASSING_PLATFORM_ADMIN_EMAILS`.
- Raised supported Node.js floor to 22 to follow current Supabase client support.

## v0.6.1.1 – Production resilience hotfix
- Prevented homepage Supabase/search/session failures from crashing the entire public site.
- Marketplace, reference data, favorites and notification count now fail independently and degrade safely.
- Added a localized route error boundary with retry/home recovery.
- Restored the broader Node 20–24 engine range; a runtime floor change is not justified as part of this feature release.
