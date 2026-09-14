# Hyrbart – skydd av kontakt- och personuppgifter

Status: launch-underlag för SCRUM-54. Senast uppdaterad 2026-09-14.

## Grundprincip

Personuppgifter och användarskapat fritextinnehåll ska bara exponeras där mottagaren är autentiserad och behörig att se innehållet. Push, e-post, SMS, driftloggar, cachelager och publika profiler ska behandlas som ytor där information kan exponeras utanför den avsedda bokningskontexten.

## Publika profiler

Publik profil får endast hämta uttryckligen godkända fält: visningsnamn, stad, avatar, bio, verifieringsstatus och reputations-/uthyrningsdata. E-post, telefonnummer, adress, betalningsuppgifter och annan privat profildata får inte hämtas eller renderas publikt.

## Bokningsmeddelanden

- Endast bokningens uthyrare och hyrestagare får läsa tråden.
- Bilagor ligger i privat Storage och signed URL skapas först efter deltagarkontroll.
- Signed URL gäller högst 1 timme.
- API-svar som innehåller meddelanden, bilagor eller signed URLs använder `Cache-Control: private, no-store`.
- Push eller annan extern kanal får aldrig innehålla användarskriven meddelandetext, bilagefilnamn, telefonnummer, e-postadress, fysisk adress eller avsändarens identitet. Extern kopia är generisk och leder till den autentiserade tråden.
- Automatiserade uthyrarmeddelanden följer samma regel; malltexten visas i den autentiserade tråden men inte i extern preview.

## Ärenden, skador och tvister

- Ärendedata får endast läsas av behöriga parter och behörig admin/support.
- Användarskriven anledning och beskrivning stannar i den autentiserade ärendevyn.
- Push/e-post använder generisk text om att ett ärende har uppdaterats.
- API-svar för privata ärenden använder `Cache-Control: private, no-store`.

## Skickbilder och andra privata bevisfiler

- Bilder ligger privat och signed URL skapas först efter deltagarkontroll.
- Signed URL gäller högst 1 timme.
- API-svar använder `Cache-Control: private, no-store`.
- Filens storage path eller signed URL får inte skickas i extern notifiering eller operativ logg.

## Notifieringar

- Detaljerad text får ligga i Hyrbarts autentiserade notiscenter när mottagaren är behörig.
- Externa kanaler använder separat privacy-safe copy för fritextkänsliga kategorier.
- Meddelanden/chatt: generisk extern titel och text.
- Ärenden/skador/tvister: generisk extern titel och text.
- Bokningsstatus, påminnelser och liknande får bara innehålla den minsta information som krävs för att användaren ska förstå att åtgärd behövs.

## Driftloggar

Operativa metadata ska redigera nycklar som kan innehålla lösenord, tokens, cookies, e-post, telefon, adress, fritextmeddelanden, beskrivningar, anledningar, filnamn/bilagor, söktext, plats och exakta koordinater. Även fria loggsträngar ska maskera uppenbara e-postadresser och telefonnummer.

Loggar ska i första hand använda tekniska identifikatorer och korrelations-ID, inte användartext.

## Testmatris inför Done

1. **Uthyrare** kan läsa sin bokningstråd, dess bilagor, skickbilder och ärenden.
2. **Hyrestagare** kan läsa samma behöriga resurser.
3. **Tredje konto** får inte läsa någon av resurserna och får inte kunna få en signed URL. För resurser där existens inte ska röjas är förväntat svar 404.
4. Signed URL ska upphöra att fungera efter TTL och får aldrig kunna skapas före behörighetskontroll.
5. Ett meddelande som innehåller test-e-post, testtelefon, adress och känslig fritext får inte visa något av detta i push/e-post-preview.
6. Ett skade-/tvistärende med känslig fritext får endast visa generisk extern notifiering.
7. Privata API-svar ska verifieras med `Cache-Control: private, no-store`.
8. Driftlogg med metadatafält `email`, `phone`, `address`, `reason`, `description`, `filename`, `lat` och `lng` ska innehålla redigerade värden.
9. Publik profil ska verifieras utan e-post, telefon eller adress.
10. Låsskärms-preview ska QA-testas på mobil med verkliga pushnotiser.

## Kvarvarande launch-verifiering

Kodreglerna ovan är implementerade men SCRUM-54 ska inte betraktas som helt Done förrän:

- tre-konto-testet har körts autentiserat,
- signed URL-behörighet och TTL har testats end-to-end,
- mobila lockscreen-previews har QA-testats,
- relevanta juridiska texter/Legal har godkänt den slutliga modellen.

Ingen del av detta dokument eller implementationen kräver Sanity-write, Sanity-schemaändring eller tokenrotation.
