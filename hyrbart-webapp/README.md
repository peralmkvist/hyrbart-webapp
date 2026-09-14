# Hyrbart

Hyrbart är en svensk peer-to-peer-marknadsplats för uthyrning av prylar och utrustning. Applikationen är mobilförst och körs i produktion på `hyrbart.se`.

## Teknik

- Next.js 15 / React
- TypeScript
- Vercel för hosting och produktionsdeployment
- Supabase för autentisering, användarprofiler, bokningar, favoriter, notifieringar, recensioner och annan transaktionsdata
- Sanity för produkt-/annonsinnehåll och relaterad CMS-data
- Playwright för E2E- och tillgänglighetstester
- Jira för produktbacklog och leveransuppföljning

## Viktiga produktflöden

- sökning enligt Vad / När / Var
- filtrering på bland annat kategori, radie, pris, betyg och rabatt
- listvy som standard med karta på begäran
- produkt-/annonsdetalj med pris, rabatter och favoritfunktion
- autentisering och användarprofil
- hyrare- och uthyrarläge
- bokningslivscykel
- meddelanden, notifieringar och recensioner
- värdprofil med månadsintäkt och månadsvisa intäktsmål
- admin- och ärendeflöden

## Arkitekturprincip

Sanity används för redaktionellt och produktrelaterat innehåll. Supabase används för användarspecifik och transaktionell data. Nya funktioner ska placeras i rätt datalager och inte skapa onödiga beroenden mellan systemen.

### Tillfällig Sanity-frysning

Det pågår en separat återställnings-/supportprocess för Sanity. Tills den är avslutad gäller följande hårda gräns för utvecklingsarbete:

- inga Sanity-writes
- inga Sanity-schemaändringar
- inga CMS-migreringar
- inga tokenrotationer eller konfigurationsändringar som påverkar Sanity
- inga ändringar som kan skapa konflikt med en senare återställning

Read-only-anrop får användas när det behövs. Frontend-, Vercel- och Supabase-arbete kan fortsätta så länge det är frikopplat från Sanity.

## Supabase-migrationer

Databasförändringar ska versionshanteras under `supabase/migrations/`. RLS ska vara aktiverat för användarspecifik data och policies ska begränsa åtkomst till rätt användare/roll.

Senaste exempel: `host_revenue_goals` lagrar ett målbelopp per användare och kalendermånad för uthyrarens intäktsmål.

## Kör lokalt

```bash
npm install
npm run dev
```

Öppna sedan `http://localhost:3000`.

För full funktionalitet krävs relevanta miljövariabler för Supabase och Sanity. Hemliga nycklar ska aldrig checkas in i repot.

## Test och build

```bash
npm run build
npx playwright test
```

Se även:

- `docs/authenticated-e2e.md`
- `docs/pre-launch-checklist.md`

## Bildpolicy för Hyrbart-produktbilder

Vid friläggning får endast bakgrunden tas bort. Själva produkten och alla tillbehör ska återges exakt som i originalet, inklusive skick, smuts, repor, slitage, färger, material, etiketter, logotyper, text, form, proportioner, perspektiv och placering. Ingen generativ rekonstruktion eller retusch av produkten får göras.

## Produktion

Produktionsdomäner:

- `https://hyrbart.se`
- `https://www.hyrbart.se`

Produktionsdeployments sker via Vercel från `main` och ska verifieras som `READY` innan ett Jira-ärende betraktas som produktionslevererat.
