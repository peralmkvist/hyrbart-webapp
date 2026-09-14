# SCRUM-135 – Assisterad onboarding och annonsimport från Hygglo

Datum: 2026-09-14

## Beslut

Bygg en **assisterad MVP** för onboarding/import. Bygg inte automatisk crawling/scraping av Hygglos webbplats och publicera aldrig importerade annonser automatiskt.

Målbilden är att användaren aktivt initierar importen, tillhandahåller eller laddar upp sitt eget annonsmaterial och ger ett uttryckligt uppdrag till Hyrbart att skapa strukturerade utkast. Hyrbart mappar, validerar och berikar sedan materialet innan användaren slutgranskar och publicerar.

## Varför assisterad MVP

Hygglos svenska villkor anger att användaren ansvarar för att ha nödvändiga rättigheter till uppladdade bilder, filmer och annonstexter. Samtidigt innebär användarens samtycke inte automatiskt att Hyrbart får maskinellt hämta innehåll från Hygglos tjänst. Hygglos tjänsteinnehåll omfattas också av egna immateriella rättigheter och användningsbegränsningar.

Därför är den säkraste första modellen att användaren själv förser Hyrbart med det material som ska importeras.

## Föreslaget flöde

1. Användaren skapar/verifierar sitt Hyrbart-konto.
2. Användaren väljer "Importera befintliga annonser".
3. Hyrbart förklarar exakt vad som importeras och vad samtycket innebär.
4. Användaren lämnar uttryckligt godkännande att Hyrbart bearbetar det material användaren själv tillhandahåller.
5. Användaren lämnar material genom en eller flera stödda vägar:
   - klistra in titel/beskrivning/priser,
   - ladda upp egna bilder,
   - ladda upp ett eget export-/underlagsdokument om sådan export finns,
   - lägga till käll-URL endast som referens/spårbarhet, inte som tillstånd till crawling.
6. Hyrbart extraherar och strukturerar materialet.
7. Systemet försöker identifiera varumärke/modell och berikar med verifierad produktinformation från tillverkare eller annan tillåten källa.
8. Systemet föreslår Hyrbart-kategori och prismappning med tydlig confidence/flagga för osäkra fält.
9. Ett eller flera Hyrbart-utkast skapas i ett separat import-/staginglager.
10. Användaren granskar, korrigerar och godkänner innan någon publicering sker.

## Data som bör stödjas i MVP

### Direkt användarlevererat
- titel
- beskrivning
- bilder som användaren har rätt att återanvända
- prisnivåer
- vad som ingår
- skick, kända fel/skador och instruktioner
- plats/utlämningsinformation som användaren själv anger

### Berikning
- verifierat märke/modell
- tekniska specifikationer från tillverkare
- manual/användarguide från tillverkare när tillåtet
- förslag på kategori
- strukturerade tillbehör

### Ska inte migreras automatiskt i MVP
- omdömen eller betyg
- svarsfrekvens/svarstid
- bokningshistorik
- kontaktuppgifter från andra Hygglo-användare
- Hygglo-interna ID:n eller metadata som inte användaren själv tillhandahåller och som saknar uttryckligt stöd

## Samtyckesmodell

Samtycket ska vara specifikt och loggbart. Användaren ska förstå att:

- Hyrbart endast bearbetar material som användaren själv tillhandahåller i MVP:n.
- användaren intygar att den har rätt att återanvända materialet på Hyrbart.
- Hyrbart får strukturera, översätta och berika materialet för att skapa utkast.
- inget publiceras automatiskt.
- användaren ansvarar för slutlig kontroll av riktighet, skick, pris och rättigheter.

Logga minst:
- user_id
- timestamp
- samtyckesversion
- importkälla/typ
- vilka filer/fält som ingick

## Dubblettskydd och spårbarhet

Varje importbatch får ett `import_id`. Varje källobjekt får en stabil fingerprint baserad på användarens underlag, exempelvis kombination av source reference + modell + titel + bildhash.

Återimport ska:
- uppdatera befintligt utkast när samma fingerprint hittas,
- inte skapa en ny dubblett,
- kunna visa vad som ändrats sedan förra importen.

Käll-URL kan sparas som referens men ska inte användas som implicit rätt att crawla sidan.

## Kvalitetsmodell

Fält klassas som:

- **Verifierat** – bekräftat mot tillverkare/auktoritativ källa.
- **Användaruppgift** – kommer från användarens eget material.
- **Föreslaget** – systemets mappning/klassificering som kräver granskning.
- **Saknas** – måste kompletteras före publicering om obligatoriskt.

Osäkra fakta får aldrig presenteras som verifierade.

## Bilder

För Hyrbart gäller fortsatt strikt bildpolicy: användarens produktbilder får inte generativt förändras. Om friläggning används får endast bakgrunden tas bort; objekt, skick, repor, slitage, färger, text, logotyper, proportioner och tillbehör ska förbli oförändrade.

## Rekommenderad teknisk placering

Under pågående Sanity-restore ska importen **inte** skapa eller modifiera Sanity-dokument.

En framtida MVP bör använda Supabase som staging/importlager, exempelvis:
- `listing_import_batches`
- `listing_import_items`
- `listing_import_assets`
- `listing_import_consents`

Först efter att Sanity-restore är avslutad och produktdatamodellen är verifierad kan godkända importutkast mappas till den slutliga publiceringsmodellen.

## Framgångsmått

Mät:
- tid från konto till första kompletta utkast
- andel startade importer som slutförs
- antal utkast per användare
- andel utkast som publiceras
- antal fält som kräver manuell korrigering
- manuellt arbete per importerad annons
- tid till första bokning
- retention efter trialperiod

## Nästa steg

1. Designa consent- och upload/paste-flöde.
2. Definiera staging-schema i Supabase.
3. Bygg importparser mot användarlevererat material.
4. Lägg till produktberikning från tillverkarkällor.
5. Lägg till review-screen före publicering.
6. Koppla ihop med SCRUM-134 för extern availability/blockering.
7. Utred separat med Hygglo om officiell partner/API/exportväg kan erbjudas; först då bör automatisk hämtning övervägas.

## Sanity-guardrail

Detta beslut innebär inga Sanity-writes, schemaändringar, migreringar eller CMS-dataändringar. All eventuell MVP-utveckling innan restore är klar ska hållas i Supabase/importlagret och applikationslagret.
