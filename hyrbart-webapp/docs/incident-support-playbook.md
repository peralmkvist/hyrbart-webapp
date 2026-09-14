# Hyrbart incident- och supportplaybook

Status: launch-underlag för Beta 1. Ägare: Operations + Product. Tekniskt stöd: Engineering.

## Syfte
Playbooken beskriver vem som agerar, i vilken ordning och hur Hyrbart begränsar skada vid drift-, betalnings-, data- och safety-incidenter. Använd alltid correlation-id från `X-Request-ID`/Drift & larm när ett tekniskt fel finns.

## Incidentnivåer

### SEV-1 – Kritisk
Används vid pågående risk för omfattande ekonomisk skada, dataläckage, kontoövertagande, felaktiga massutbetalningar, säkerhetsincident med omedelbar personrisk eller total otillgänglighet i kritiskt bokningsflöde.

- Incident Commander: Operations lead / utsedd super_admin.
- Product: beslutar kundpåverkan, eventuell funktionsavstängning och extern kommunikation.
- Engineering: isolerar teknisk orsak, stoppar fortsatt skada och verifierar återställning.
- Trust & Safety: äger fysisk säkerhet, hot, bedrägeri och allvarliga missbruksärenden.
- Finance: äger betalning, refund, payout och reconciliation.
- Första åtgärd: stoppa skada före felsökning. Pausa berört flöde hellre än att låta osäkra transaktioner fortsätta.
- Uppdateringskadens under aktiv incident: minst var 30:e minut i incidentloggen.
- Efterarbete: postmortem obligatorisk.

### SEV-2 – Hög
Betydande påverkan på flera användare eller ett kritiskt flöde utan omedelbar fysisk säkerhetsrisk eller pågående omfattande data-/pengaförlust.

- Incident Commander: Operations.
- Engineering + relevant funktionsägare kopplas in.
- Första status inom samma arbetspass.
- Postmortem krävs om incidenten påverkat bokning, pengar, data eller safety.

### SEV-3 – Medel
Begränsat fel med workaround; enskilda bokningar eller användare påverkas.

- Support/Operations äger ärendet.
- Escalera till Engineering när correlation-id visar tekniskt fel eller workaround saknas.

### SEV-4 – Låg
Kosmetiskt fel, informationsfråga eller begränsad avvikelse utan affärs-/säkerhetspåverkan.

- Hanteras i normal support-/backlogprocess.

## Gemensam incidentprocedur

1. **Bekräfta och klassificera.** Sätt SEV-nivå och skriv ned starttid.
2. **Skapa ett incident-id.** Använd `INC-YYYYMMDD-NNN`. Koppla alla relevanta correlation-id:n, boknings-id:n och användar-id:n.
3. **Stoppa fortsatt skada.** Frys payout, stoppa automation, begränsa konto eller stäng av en osäker funktion när det är proportionerligt.
4. **Bevara bevis.** Ändra inte audit-/operational events. Spara tidslinje, correlation-id, status före/efter och relevanta ledger-/booking-event.
5. **Fastställ ansvarig.** En Incident Commander fattar operativa beslut; övriga roller rapporterar till den personen under incidenten.
6. **Kommunicera.** Berörda användare får endast verifierad information. Undvik tekniska detaljer, skuldfrågor och löften om ersättning innan beslut finns.
7. **Återställ kontrollerat.** Verifiera health, dataintegritet och minst ett representativt användarflöde innan incidenten stängs.
8. **Reconcile.** För betalnings-/bokningsincidenter jämförs ledger, booking events och faktisk användarstatus.
9. **Stäng och följ upp.** Dokumentera rotorsak, påverkan, åtgärd och förebyggande backlogpunkt.

## Runbook: Payment / payout

### Triggers
- capture/refund misslyckas eller får okänd status
- dubbeldebitering eller fel belopp
- payout går till fel mottagare eller innan hold borde släppts
- ledger och extern PSP avviker

### Omedelbara åtgärder
1. Klassificera SEV-1 vid risk för felaktiga massutbetalningar eller systematisk dubbeldebitering; annars SEV-2/3.
2. Stoppa berörd payout/capture-automation om fortsatt ekonomisk skada kan uppstå.
3. Frys payout för berörda bokningar hellre än att göra manuell korrigering utan full spårbarhet.
4. Samla booking-id, payment/payout-id, correlation-id och ledgerhändelser.
5. Gör ingen manuell återbetalning förrän man verifierat att leverantören inte redan genomfört den.
6. Reconcile providerstatus mot intern ledger innan återöppning.

### Kundkommunikation
- Bekräfta att betalningsärendet utreds.
- Säg inte att pengar är återbetalda/utbetalda innan providerstatus är verifierad.
- Vid faktisk ekonomisk påverkan dokumenteras belopp, valuta, beslut och vem som godkände korrigeringen.

### Exit criteria
- inga okända/duplicerade transaktioner kvar
- ledger = provider för alla berörda poster
- payout hold/capture-state korrekt
- representativ bokning verifierad end-to-end

## Runbook: Data / integritet

### Triggers
- misstänkt exponering av personuppgifter
- fel användare kan läsa bokning, bilaga, profilfält eller admininformation
- data har ändrats/raderats oväntat
- restore/migration har skapat inkonsistens

### Omedelbara åtgärder
1. SEV-1 vid aktiv obehörig åtkomst eller större dataläckage. Annars minst SEV-2.
2. Stoppa aktuell endpoint/funktion eller återkalla berörd åtkomst/session om läckan är aktiv.
3. Bevara auditlogg, operational events, request-id, berörda objekt och tidsfönster.
4. Kör inte destruktiv återställning innan omfattning och senaste betrodda datapunkt är känd.
5. Verifiera RLS/grants och server-side authorization separat.
6. Product/Operations bedömer om juridisk/privacy-eskalering behövs. Eventuella GDPR-tidsfrister hanteras som separat legal process.

### Exit criteria
- obehörig åtkomst är tekniskt stoppad
- omfattning identifierad
- restore/datakorrektion verifierad mot minst två oberoende källor där möjligt
- berörda flöden testade med rätt och fel användarroll
- eventuell användarkommunikation/legal uppföljning beslutad

## Runbook: Trust & Safety / fysisk säkerhet

### Triggers
- hot, våld, stalking, utpressning eller allvarligt trakasseribeteende
- misstänkt stöld/bedrägeri med pågående risk
- farligt eller förbjudet objekt
- akut situation vid utlämning/återlämning

### Omedelbara åtgärder
1. Vid omedelbar fara: uppmana användaren att kontakta 112/polis. Hyrbart ska inte ersätta räddningstjänst eller polis.
2. Trust & Safety tar incidentägarskap; Operations koordinerar tekniska/adminåtgärder.
3. Bevara meddelanden, booking events, condition evidence och auditlogg. Radera inte innehåll som kan behövas som bevis.
4. Begränsa/frys konto vid tydlig risk för fortsatt skada och dokumentera skälet i audit.
5. Stoppa payout vid relevant tvist/fraud-risk tills beslut finns.
6. Dela aldrig motpartens privata kontakt- eller positionsuppgifter utanför vad policy/rättslig grund medger.

### Exit criteria
- omedelbar risk hanterad
- kontostatus och payout-status beslutade
- ärendeägare och nästa användarkontakt tydligt definierade
- eventuella myndighets-/försäkringssteg dokumenterade

## Runbook: Auth / admin compromise

- Spärra adminkonto och återkalla alla adminsessioner.
- Kontrollera admin_login_events och admin_audit_log.
- Rotera relevant hemlighet endast om det finns konkret risk att den exponerats; dokumentera rotationen.
- Kontrollera rolländringar, payout/risk-actions och exporter under incidentfönstret.
- Vid vanligt användarkonto: återkalla sessioner och begränsa kontot vid aktivt missbruk.

## Runbook: Booking state / automation

- Stoppa automationen om den gör felaktiga massövergångar.
- Ändra inte booking-status manuellt utan att kontrollera state-machine, ledger och booking events.
- För enskild bokning: samla booking-id + correlation-id och jämför `bookings`, `booking_events`, betalningsledger och pickup/return-events.
- Efter fix: testa både normal transition och en transition som ska nekas.

## Runbook: Plattform / databas nere

- `/api/health` är första kontrollen.
- Om app lever men database != ok: behandla som minst SEV-2, SEV-1 om bokning/pengar riskerar inkonsistens.
- Undvik retries på muterande operationer om idempotency inte är verifierad.
- Vid Vercel-fel: kontrollera senaste READY deployment och runtime-loggar.
- Vid Supabase-fel: kontrollera projektstatus, RLS/grants och migrationshistorik innan rollback/restore.

## Supporttriage

Support samlar alltid:
- användarens beskrivning och faktisk påverkan
- booking-id om tillämpligt
- tidpunkt och tidszon
- correlation-id om användaren fått ett eller om det kan hämtas från Drift & larm
- skärmbild endast om den tillför information; be aldrig användaren skicka lösenord, 2FA-kod, fullständiga kortuppgifter eller recovery codes

Support får själv hantera SEV-3/4 enligt behörighet. SEV-1/2 eskaleras till Operations och relevant specialistroll.

## Kommunikationsprinciper

- Bekräfta vad som är känt, inte vad vi tror.
- Ge nästa konkreta steg och när ny information finns i incidentprocessen; lova inte ett utfall innan det är verifierat.
- Publicera inte personuppgifter, exakta adresser, betaluppgifter, säkerhetsloggar eller interna tokens i incidentkanaler.
- En person äger extern status för att undvika motstridiga besked.

## Tabletop – 2026-09-14

### Scenario A: Payment
Simulerad situation: flera bokningar får okänd capture-status samtidigt som payout-jobbet är schemalagt.

Beslut:
- SEV-1 om payout riskerar att gå trots okänd capture; annars SEV-2.
- stoppa payout först, samla provider/ledger-status, undvik automatiska retries som kan dubbeldebitera
- Finance äger reconciliation, Operations är Incident Commander, Engineering isolerar felvägen
- återöppning först när provider och ledger stämmer

Resultat: playbook ger tydlig ägare, containment och exit criteria. Godkänd tabletop.

### Scenario B: Data
Simulerad situation: en användare uppges kunna öppna en annan användares bokningsbilaga.

Beslut:
- SEV-1 tills aktiv obehörig åtkomst avfärdats eller stoppats
- stäng/isolera endpointen, bevara logs och correlation-id, verifiera signed URL + RLS + authorization
- kartlägg exponeringsfönster innan restore/datamutation
- Product/Operations initierar privacy/legal-bedömning vid bekräftad exponering

Resultat: playbook prioriterar containment och bevisbevarande före korrigering. Godkänd tabletop.

### Scenario C: Safety
Simulerad situation: en hyrestagare uppger hot från motparten vid återlämning samtidigt som objektet ännu är aktivt.

Beslut:
- akut fysisk fara hänvisas omedelbart till 112/polis
- Trust & Safety äger säkerhetsärendet, Operations kan begränsa konto och stoppa payout
- meddelanden/evidence bevaras, ingen privat motpartsdata lämnas ut
- boknings-/betalningsfrågan hanteras efter att personrisken stabiliserats

Resultat: fysisk säkerhet prioriteras över marknadsplatsens kommersiella flöde och ansvarsfördelningen är tydlig. Godkänd tabletop.

## Launch gate

Före publik launch ska följande vara sant:
- Drift & larm är åtkomligt för rätt adminroller.
- Minst en Incident Commander är utsedd per driftperiod när Hyrbart har externa kunder.
- Kontaktväg till payment provider, Supabase/Vercel och eventuell försäkrings-/ID-leverantör finns dokumenterad när dessa går live.
- Playbooken tabletop-testas igen efter större förändringar i betalning, auth, dataarkitektur eller safety-policy.
- Backup/restore-proceduren (SCRUM-87) ska vara verifierad separat; denna playbook ersätter inte backup-runbooken.
