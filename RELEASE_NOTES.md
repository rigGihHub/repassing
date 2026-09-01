# v0.6.0.6 — Visible version hotfix

- Versionsnumret visas nu alltid som en diskret fast etikett nere till höger, i stället för först längst ned efter allt sidinnehåll.
- På mobil placeras etiketten ovanför den fasta bottennavigationen.
- UI-versionen hämtas direkt från `package.json`, så samma källa används av npm och den synliga versionsetiketten.
- `package.json` och `VERSION` uppdaterade till 0.6.0.6.
- Ingen databasändring eller migration.

# Repassing v0.6.0.5 — Club marketplace bridge

## Förändringar
- Föreningssidan har nu tydliga vägar direkt till föreningens filtrerade marknad och till säljflödet.
- `Sälj i föreningen` förväljer aktuell förening i annonsformuläret och förklarar vilket val som gjorts.
- Avancerade annonsuppgifter öppnas automatiskt när en förening är förvald, så valet är synligt och enkelt att ändra.
- Inloggning från säljflödet behåller både returvägen och eventuell förvald förening.
- Okända eller ogiltiga förenings-ID:n ignoreras säkert och ger normalt säljflöde.
- Ingen ny databasändring eller migration.

## Verifiering
- Versionskedjan och ZIP-strukturen är kontrollerade i arbetsmiljön.
- Full `npm install` / `npm run build` har inte verifierats i denna arbetsmiljö.

---

# v0.6.0.4 — Club Pilot flow clarity

- Adds a compact three-step explanation before the club application form so users know what happens after submitting.
- Clarifies that the application is free and creates no subscription or commitment.
- Centralizes human-readable organization role and application status labels to avoid UI drift between club pages.
- Adds a safe neutral visual state for unknown/future application statuses instead of deriving CSS classes from database values.
- Gives users a specific message when their login session expires during application submission.
- Improves form busy-state semantics and mobile presentation of the application steps.
- No database schema changes and no new migration.

# v0.6.0.3 — Club Pilot clarity polish

- Human-readable club roles replace internal role codes in the club UI.
- Application cards now show submitted date and decision note when available.
- Temporary application-loading errors include a retry action.
- Application success state now links directly to My clubs or the marketplace.
- Optional website input is validated server-side as http(s).
- Club admin copy no longer exposes internal roadmap wording.
- No database schema changes and no new migration.

# v0.6.0.2 — Club Pilot UX & safety polish

- Förbättrar föreningsansökan med tydligare validering, autokomplettering, mobilvänliga fält och robust nätverksfelhantering.
- Hindrar dubbla pågående ansökningar från samma användare till samma föreningsnamn.
- Visar begripliga statusetiketter för ansökningar och en separat driftstörningsvy i stället för att dölja fel.
- Lägger till ett tydligt tomläge när användaren ännu inte har en ansluten förening eller ansökan.
- Bevarar locale i login-redirects även för Mina föreningar och föreningsadmin.
- Föreningsvyn visar adminlänk endast för CLUB_ADMIN/ORG_OWNER och tar bort teknisk interncopy.
- Städning: tar bort `any` i ansökningsmappningen.
- Ingen ny databasstruktur eller ny migration. Den befintliga v0.6.0.1-policy-migrationen gäller fortfarande.

# v0.6.0.1 — Club Pilot schema alignment

- Anpassar Club Pilot till den redan befintliga `organization_applications`-tabellen i Supabase.
- Återskapar inte tabellen och ändrar inte befintliga kolumner.
- API:t använder nu `organization_name`, `country_code`, `sport_codes`, `notes` och status `SUBMITTED`.
- Mina föreningar läser den befintliga tabellstrukturen.
- Migrationen lägger endast till SELECT/INSERT för authenticated samt RLS-policyer så användaren bara kan skapa och läsa sina egna ansökningar.
- Ersätter den felaktiga v0.6.0-migrationen.

# v0.6.0 — Club Pilot, del 1

- Föreningsansökan.
- Ansökningsstatus under Mina föreningar.
- Skyddad föreningsadmin för CLUB_ADMIN/ORG_OWNER.
- RLS-skyddad migration för organization_applications.
- Kräver Supabase-migration innan ansökningsfunktionen används live.

# v0.5.4.2 — Visible app version

- Shows the current Repassing version globally at the bottom of the app.
- Uses one central `APP_VERSION` constant for the UI version label.
- Aligns `VERSION` and `package.json` to 0.5.4.2.
- No database migration required.

# Repassing v0.5.4.1 — Marketplace UX polish

- Kollapsade filter förblir sekundära och visar antal aktiva filter.
- Mobilfilter beter sig som en bottenpanel när de öppnas.
- Hero-sektionen är kompaktare så marknaden kommer högre upp.
- Empty state vid tom marknad har tydligare supply-CTA: sälj första prylen.
- Den lågvärdiga trekolumnsremsan längst ned på startsidan är borttagen.
- Ingen databasmigration krävs.
# Repassing v0.5.4 — Marketplace Simplification

- Removes the hard-coded ÖSK Fotboll marketplace identity and derives club context from live data/filter state.
- Makes the marketplace value proposition clearer for first-time visitors.
- Collapses advanced marketplace filters behind a simple Filter control; active filters remain visible/open.
- Adds a supply-focused empty state with a direct Sell action when the marketplace has no listings.
- Simplifies the Sell flow: SEK is implicit, optional description/club/team/sport/category/brand fields are grouped under “More details”.
- Removes developer-facing LIVE MARKETPLACE/Storage wording from the sell experience.
- Changes mobile navigation from Favorites to Deals/Orders, while Favorites remain available in the header and marketplace.
- No database migration.
