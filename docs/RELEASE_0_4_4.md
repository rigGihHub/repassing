# Release 0.4.4

This release turns marketplace interest into an operational transaction flow without pretending payment is already integrated. A buyer can reserve an available item, create a real pending order, initiate a local handoff, and contact the seller. Database functions perform the critical reservation/order/conversation creation atomically under authenticated identity.

Payment remains a separate domain and is intentionally not simulated.
