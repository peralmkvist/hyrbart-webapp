# SCRUM-82 – Manuell onboarding-fallback

## Syfte
Säkerställa att en värdefull uthyrare kan komma igång även när automatiserad import/migrering inte kan användas. Flödet är en fallback, inte en genväg runt verifiering eller publiceringskrav.

## När fallback används
1. Importen har misslyckats eller saknas för källan.
2. Uthyraren vill fortsätta manuellt.
3. Support har bekräftat att problemet inte kan lösas omedelbart genom vanlig retry.

## Ansvar
- **Support/Operations:** äger ärendet, samlar in underlag, följer checklistan och återkopplar till uthyraren.
- **Uthyraren:** bekräftar att informationen är korrekt och har rätt att använda text/bilder som lämnas in.
- **Produkt/Engineering:** eskaleringspunkt endast om ett återkommande tekniskt fel identifieras. Support ska inte ändra produktionsdata direkt för att kringgå ett fel.

## Måltid
- Triage: högst 10 minuter aktiv supporttid.
- Underlag och manuell registrering: normalt 15–30 minuter per uthyrare, exklusive väntan på svar.
- Eskalering: om fler än 5 annonser kräver handpåläggning eller samma fel uppstår för flera uthyrare ska ärendet lyftas till Product/Engineering i stället för att skalas manuellt.

## Playbook
1. Registrera källa, användare och tidpunkt för importfelet i supportärendet. Spara inte lösenord, sessionscookies eller andra autentiseringshemligheter.
2. Be uthyraren använda Hyrbarts ordinarie konto-/verifieringsflöde. Ingen verifiering får markeras manuellt utan verifierbart underlag och ett godkänt operativt förfarande.
3. Samla endast in de annonsuppgifter som krävs av det ordinarie skapa-annons-flödet. Uthyraren ska bekräfta innehållet innan publicering.
4. Skapa annonser genom samma produktgränssnitt och valideringsregler som vanlig manuell annonsering. Gör inga direkta databas- eller CMS-ingrepp som fallback.
5. Kontrollera titel, kategori, pris, plats, tillgänglighet, bilder och obligatoriska säkerhets-/produktuppgifter i den färdiga förhandsvisningen.
6. Låt uthyraren själv godkänna/publicera där ordinarie produktflöde kräver det.
7. Markera supportärendet löst och registrera rotorsak som `import`, `source-data`, `user-input` eller `unknown` för senare analys.

## Stoppsignaler
Avbryt fallbacken och eskalera om identitet/verifiering inte kan genomföras, ägarskap/rättigheter till material är oklara, data skulle behöva skrivas direkt i Sanity/databas, eller om ett tekniskt fel riskerar att skapa felaktiga annonser/bokningar.

## Verifiering inför Beta 2
Acceptanskriteriet verifieras med ett manuellt testkonto: simulera misslyckad import, följ playbooken och skapa minst en komplett annons via ordinarie användarflöde. Godkänt först när annonsen kan granskas utan direkta backend-ingrepp och supportens aktiva tid dokumenterats. Testet ska inte använda eller förändra återställningskänslig Sanity-data.
