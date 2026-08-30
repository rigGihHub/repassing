# Repassing v0.4.3 — Search, filters & favorites

## Nytt
- Riktig fritextsökning mot Supabase `search_marketplace` med relevansrankning.
- Filter för förening, sport, kategori, storlek och prisintervall.
- Sökresultatet bevarar databasens relevansordning och visar tydligt antal träffar.
- Tomt resultat får en riktig empty-state med snabb återställning av filter.
- Favoriter är nu fullt funktionella med den befintliga `favorites`-tabellen och RLS.
- Hjärtat på annonskort växlar favorit av/på för inloggad användare.
- Ny sida **Mina favoriter** med riktiga Supabase-data.
- Favoritknapp även på annonsdetaljsidan.
- Favoritantal visas i sidhuvudet och mobilnavigationen länkar direkt till favoriter.
- Gäster som försöker favoritmarkera skickas till inloggning utan att skapa osäkra anonyma favoriter.
- Mobilanpassade sök- och filterkontroller.

## Tekniskt
- Ingen ny databasmigration krävs i denna release; befintlig `favorites`-modell, RLS och `search_marketplace` RPC återanvänds.
- Favorit-API validerar returväg och aktuell annonssynlighet.
- Storleksfilter görs på resultatens `size_label` utan att ändra den redan live-satta RPC-signaturen.

## Verifiering
- Ändrade TypeScript/TSX-filer har syntaxkontrollerats med TypeScript transpile diagnostics.
- Full `npm install` kunde inte slutföras i arbetsmiljön på grund av timeout; Vercel-build efter push är därför slutlig full build-verifiering.
