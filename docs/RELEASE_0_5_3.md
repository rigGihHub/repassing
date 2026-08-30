# Repassing v0.5.3 — Notifications & transaction receipt

## What changed
- In-app notification inbox backed by `notification_inbox`.
- Automatic localized notifications for reservations, new messages, confirmed payments, handoff scheduling, handoff confirmations, cancellations and completed orders.
- Time-aware handoff reminder that becomes visible two hours before the scheduled handoff without requiring a separate in-app worker.
- Idempotent notification `event_key` plus outbox event creation for future email/push workers.
- Notification bell with unread count and a dedicated notifications page.
- Mark-one and mark-all-as-read flows protected by existing RLS and notification immutability guard.
- Completed orders expose a transaction receipt with print/save-as-PDF support.
- Receipt includes order id, item, dates, amounts, Repassing fee, buyer total and seller proceeds, while clearly stating that it is not a VAT/tax invoice.

## Database
Migrations: `20260830125000_add_in_app_transaction_notifications.sql` and `20260830125500_add_handoff_reminder_availability.sql`.
Both migrations have also been applied to the live Supabase project.

## Scope note
This release delivers **in-app notifications**. Email and push delivery remain a later worker/provider step; the outbox records are created now so those channels can be added without changing transaction events again.
