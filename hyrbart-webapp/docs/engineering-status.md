# Engineering status – 2026-09-14

Detta dokument sammanfattar tekniskt läge och tillfälliga utvecklingsbegränsningar för Hyrbart.

## Produktion

- Produktionsdomän: `hyrbart.se`
- Hosting/deployment: Vercel
- Produktionsbranch: `main`
- Databas/auth/transaktionsdata: Supabase
- Produkt-/CMS-data: Sanity

## Sanity – tillfällig guardrail

En separat återställnings-/supportprocess pågår. Fram till uttryckligt klartecken gäller:

- inga Sanity-writes
- inga schemaändringar
- inga CMS-/datamigreringar
- inga tokenrotationer eller konfigurationsändringar som påverkar Sanity
- inga ändringar som riskerar konflikt med en senare återställning

Read-only-anrop är tillåtna när de behövs. Funktioner som kan byggas helt i frontend, Vercel eller Supabase kan fortsätta.

## Senast levererat

### SCRUM-115 – produktfilter

Implementerat i produktion: kategori, radie, maxpris för vald period, minsta betyg, rabattfilter, aktiva filterchips och rensa alla. Ticket kvar i Testing eftersom vissa datamodellsberoende delar, bland annat utlämning/leverans, inte är implementerade och full verifiering påverkas av Sanity-läget.

### SCRUM-133 – lista före karta

Lista är standard. Kartan laddas först på användarens begäran. Ticket kvar i Testing tills full funktionell verifiering med återställd produktdata kan göras.

### SCRUM-128 – rabattvisning

Rabattregler visas på produktdetaljen från samma befintliga pris-/rabattdata som prismotorn använder. Ingen ny Sanity-modell infördes.

### SCRUM-124 – favoritantal

Favoritantal är levererat på produktdetaljen via Supabase och exponerar inga användaridentiteter. Ticket är **inte komplett** enligt nuvarande Jira-scope eftersom samma count även ska visas på annonskort/listvy.

### SCRUM-139 – månadsvisa intäktsmål

Levererat i produktion. Mål lagras per användare och månad i Supabase med RLS. Intäkt definieras i första versionen som `rental_price` för bokningar med startdatum i vald månad och status `paid`, `active`, `returned` eller `completed`.

## Databasdisciplin

Alla nya Supabase-schemaändringar ska:

1. göras via migration,
2. versionshanteras under `supabase/migrations/`,
3. använda RLS för användarspecifik data,
4. följas av Supabase security/performance advisors,
5. inte koppla in Sanity om det inte är nödvändigt.

## Jira-disciplin

En ticket ska inte betraktas som klar bara för att koden är deployad. Acceptanskriterier ska jämföras mot faktisk implementation. Produktionsstatus kräver Vercel `READY`; funktioner som inte kan verifieras på grund av Sanity-frysningen ska ligga kvar i Testing eller motsvarande tills verifieringen går att göra.
