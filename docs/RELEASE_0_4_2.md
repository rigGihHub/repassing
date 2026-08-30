# Release 0.4.2

This release completes the first usable listing lifecycle around the live marketplace foundation. Public visitors can open an active listing and browse its image gallery and metadata. Authenticated sellers can manage their own listing without exposing seller-only controls to other users.

Deletion is intentionally implemented as a status transition to `REMOVED`, not a physical delete. This preserves marketplace/audit history and avoids breaking future order references.
