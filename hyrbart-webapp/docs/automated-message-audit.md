# Automatiserade meddelanden – inventering och gap-analys

Status: verifierat kodläge 2026-09-15 för SCRUM-157. Dokumentet kompletterar `docs/notification-matrix.md`; den exekverbara kanalpolicyn finns i `lib/notification-policy.ts`.

## 1. Uthyrarens egna automatiserade chattmeddelanden

Dessa är **inte Hyrbart-systemnotiser** utan innehåll som uthyraren själv skapar och som levereras i ordinarie bokningschatt.

| Trigger | Mottagare | Kanal | Tidpunkt | Språk/innehåll | Destination | Obligatoriskt |
|---|---|---|---|---|---|---|
| Bokningsförfrågan skapad | Hyrestagare | Bokningschatt + notifiering om nytt meddelande | Direkt eller efter vald offset | Uthyrarens egen fria text | Bokningschatten | Nej, uthyrare väljer mall |
| Bokning accepterad | Hyrestagare | Bokningschatt + notifiering | Direkt eller efter offset | Uthyrarens fria text | Bokningschatten | Nej |
| Betalning fångad | Hyrestagare | Bokningschatt + notifiering | Direkt eller efter offset | Uthyrarens fria text | Bokningschatten | Nej |
| Inför/efter hämtning | Hyrestagare | Bokningschatt + notifiering | Före, vid eller efter pickup_due | Uthyrarens fria text | Bokningschatten | Nej |
| Inför/efter retur | Hyrestagare | Bokningschatt + notifiering | Före, vid eller efter return_due | Uthyrarens fria text | Bokningschatten | Nej |
| Uthyrning avslutad | Hyrestagare | Bokningschatt + notifiering | Direkt eller efter offset | Uthyrarens fria text | Bokningschatten | Nej |

Skydd: mallar är ägarskopade, kan gälla alla eller valda annonser, kan pausas, och leverans loggas med unik `event_key`. Bilagor kopieras till bokningens privata attachment-lagring. Dispatchern accepterar högst sex timmars sen körning för en schemalagd mall.

## 2. Hyrbarts systemnotiser – nuvarande kanalmatris

Följande kategorier är implementerade i `notification-policy.ts` och kan styras per App/Push/E-post/SMS där kanalen är valbar:

- nya följare
- nya bokningar
- bokningsändringar, inklusive avboknings-/statushändelser
- nya meddelanden
- nya produkter från följda uthyrare
- prisändringar på favoritprodukter
- sökbevakningsträffar
- hämtning/retur-påminnelser

Booking, booking_update, message och pickup_return_reminder är obligatoriska i appen. SMS-preferensen kan sparas men faktisk SMS-leverans är ännu inte aktiverad. Push/e-post respekterar kanalpreferensen även vid retry.

## 3. Faktiskt observerad produktionsdata

Vid inventeringen 2026-09-15 innehöll `user_notifications` endast eventtypen `request_expired` (2 poster). Den mappas av central policy till `booking_update`. Detta visar att infrastrukturen finns men att flera framtida kategorier ännu saknar verkliga produktionshändelser att E2E-verifiera.

## 4. Identifierade gap

### Funktionella gap

1. **Omdömespåminnelser** använder fortfarande legacy-preferensen `review_enabled` när eventtypen inte kan mappas till den nya kanalmatrisen. De är därför inte en egen rad i den nya per-kanal-vyn.
2. **Ekonomi/payout** har ingen egen användarstyrd kategori i kanalmatrisen. Betalningsrelaterade bokningshändelser faller i dag normalt under `booking_update`.
3. **Säkerhet/konto** saknar egen kategori i kanalmatrisen. Kritiska kontohändelser bör inte göras valbara utan ett separat produktbeslut om vilka externa kanaler som är obligatoriska.
4. **Digest/frekvensval i UI** är ännu inte implementerat. Policyn anger vilka kategorier som är digest-berättigade och har 24h-gränser, men användaren kan inte välja direkt/daglig/veckovis sammanfattning.
5. **SMS-provider** är inte aktiverad; SMS-inställningar är därför endast förberedda.
6. Flera framtida event (följare, favoritpris, följda uthyrares nya annonser, sökbevakningar) måste anropa `notifyUser` från respektive feature innan de kan verifieras end-to-end.

### UX-/QA-gap

- full mobil- och skärmläsar-QA av matrisen återstår
- push permission/subscribe behöver verifieras end-to-end från inställningsvyn
- notiser med borttagen/otillgänglig destination behöver särskilt fallbackläge
- autentiserade tester av kanalval, idempotent dubbel event_key och frekvensgräns återstår

## 5. Åtgärdat inom SCRUM-157

- central kanalmatris används av både inställnings-API och leveransmotor
- kanalstatus visas för Push/E-post/SMS
- obligatoriska in-app-notiser kan inte stängas av
- preferensändringar audit-loggas
- externa valbara notiser frekvensbegränsas
- unik event key ger dubblettskydd
- användaren kan nu **återställa samtliga kanalval till Hyrbarts rekommenderade standardinställningar**; återställningen audit-loggas per notistyp och kanal

## 6. Rekommenderade följdärenden

Följande bör hållas separata från denna inventering för att undvika att blanda produktbeslut med teknisk implementation:

- besluta och implementera kategori/policy för omdömen i den nya matrisen
- besluta om ekonomi/payout ska vara egen kategori eller fortsatt ingå i booking_update
- besluta vilka säkerhets-/kontohändelser som alltid måste nå användaren externt
- designa faktisk digest-kö (direkt/daglig/veckovis) innan UI-val exponeras
- aktivera SMS-provider inom SCRUM-56

Ingen Sanity-data, Sanity-schema, token eller CMS-konfiguration berörs av denna inventering.
