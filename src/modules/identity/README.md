# Identity domain

Identity owns authentication boundaries, user lifecycle and session contracts.

## Rules
- UI never depends on a specific auth vendor SDK.
- `IdentityProvider` is the port. Managed-auth adapters live under `infrastructure/`.
- Authorization is server-side and separate from authentication.
- Provider subject IDs are stored separately from Repassing user IDs.
- Preview identity is explicit and temporary; it is not production authentication.
