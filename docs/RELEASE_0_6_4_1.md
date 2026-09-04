# Repassing v0.6.4.1 — Human Search

Första lilla steget mot mänskligare sök utan AI eller ny databasmigration.

- Sökraden kan nu plocka ut en tydlig storlek ur fritext, t.ex. `fotbollsskor 38`, `ÖSK jacka 152` och `Nike skor 39`.
- Storleken används som storleksfilter medan övriga ord skickas vidare till befintlig `search_marketplace`-rankning.
- Ett storleksfilter som användaren själv valt vinner alltid över en storlek som tolkats ur sökraden.
- `innebandyklubba junior` lämnas orörd eftersom `junior` inte antas vara en storlek.
- Ingen AI och ingen ny SQL-migration introduceras i denna release.
- Samtidigt rättas ordningen för `hasFilters`/`lowSupply` på startsidan så att filterläget beräknas innan det används.

Medveten begränsning: vi bygger inte synonymmotor ovanpå en RPC vars live-definition saknas i migrationshistoriken. Nästa söksteg bör tas först efter att den faktiska live-funktionen har verifierats och lagts under versionskontroll.
