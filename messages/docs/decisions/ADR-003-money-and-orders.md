# ADR-003: Money and order invariants

Status: Accepted

All monetary values use integer minor units plus an explicit ISO currency code. Listing, Order, Payment, Fee and Fulfillment are separate concepts. A Listing can back at most one Order. Production purchase creation must use a database transaction/locking strategy to prevent double selling.
