# Hygglo-samexistens – beslut och rekommenderad MVP

Senast verifierad: 14 september 2026

## Beslut

Bygg en **begränsad MVP för parallell publicering**, men bygg **inte** någon inofficiell Hygglo-integration, scraping eller dold kalendersynk.

MVP:n ska utgå från att uthyraren själv kan hålla båda plattformarna uppdaterade, med Hyrbart som stöd genom snabb extern blockering, tydliga varningar och ett enkelt trial-flöde.

## Vad som verifierats

### Hygglos officiella funktioner

- Hygglo har en kalender per annons där lediga datum visas.
- Uthyrare kan blockera dagar manuellt för en enskild annons.
- Uthyrare kan även blockera samma datum för flera annonser samtidigt via profilens blockeringsflöde.
- En blockerad period gör annonsen otillgänglig för nya förfrågningar.
- Jag hittade ingen offentlig dokumentation för iCal/ICS-export, kalenderprenumeration, webhook eller publikt API i Hygglos svenska hjälpcenter eller webbplats.

### Avtalsmässigt

- Svenska villkor anger att uppgifter erhållna via tjänsten inte får användas för andra ändamål än kontakt med andra användare.
- Svenska villkor anger att användaren måste ha rättigheter till det innehåll som användaren själv laddar upp.
- Att användaren äger sitt eget innehåll innebär inte automatiskt att Hyrbart får hämta det maskinellt från Hygglos tjänst.
- Hygglos andra marknader har uttryckliga begränsningar mot automatiserad scraping; det stärker skälet att inte bygga en teknisk metod utan uttryckligt stöd från Hygglo.

## Alternativbedömning

| Alternativ | Tillförlitlighet | Teknisk komplexitet | Dubbelbokningsrisk | Rekommendation |
|---|---:|---:|---:|---|
| Officiell tvåvägssynk/API | Hög om stödd | Medel–hög | Låg | Bäst långsiktigt, men kräver officiellt stöd |
| iCal/ICS-feed | Medel | Medel | Medel p.g.a. synklatens | Bygg endast om Hygglo erbjuder officiell feed |
| Automatisk scraping av Hygglo | Låg | Hög | Hög | Bygg inte |
| Manuell extern blockering i Hyrbart | Hög som lokal källa | Låg | Medel | Bygg som MVP |
| Påminnelser/varningar vid extern bokning | Hög | Låg | Medel | Bygg som MVP |
| Gemensamt trial-/migreringsflöde | Hög | Medel | Beror på blockeringsdisciplin | Bygg efter MVP |

## Rekommenderad MVP

1. Lägg till ett tydligt val på Hyrbart: **”Jag hyr även ut denna pryl på en annan plattform.”**
2. Ge uthyraren en snabb åtgärd för **extern blockering** av datum på objektet.
3. Visa extern blockering i Hyrbarts availability med separat källa, exempelvis `external_manual`.
4. Låt externa blockeringar stoppa Hyrbart-bokning på samma sätt som lokala blockeringar.
5. Visa en tydlig status i värdgränssnittet: extern uthyrning finns / inga externa blockeringar registrerade.
6. Efter Hyrbart-bokning: påminn uthyraren att blockera samma period på Hygglo om objektet ligger publicerat där.
7. Vid skapad extern bokning: gör Hyrbart-blockering möjlig på ett fåtal klick från värdprofil eller kalender.
8. Spara källan och tidsstämpel för varje extern blockering för spårbarhet.

## Source of truth

För MVP:n är **Hyrbarts egen availability** source of truth för om en Hyrbart-bokning får skapas.

Externa bokningar kan bara påverka Hyrbart när uthyraren själv registrerat dem som blockeringar. Hyrbart ska därför aldrig påstå att vi garanterar full synk med Hygglo i denna version.

## Race conditions och fallback

- Hyrbart ska kontrollera availability atomiskt precis innan bokningen skapas.
- Känd extern blockering ska behandlas som hård blockering.
- Om användaren inte har registrerat en extern bokning kan Hyrbart inte upptäcka konflikten i MVP:n.
- Därför ska användaren få tydlig copy om att parallell publicering kräver att externa bokningar registreras omgående.
- Om Hygglo senare erbjuder officiell API-/kalendersynk kan `external_manual` kompletteras med `external_hygglo` utan att availability-modellen behöver byggas om.

## Trial-hypotes

Mät:

- andel Hygglo-uthyrare som aktiverar parallell publicering,
- antal externa blockeringar,
- antal upptäckta/förhindrade konflikter,
- tid till första Hyrbart-bokning,
- andel som fortsätter efter trialperiod,
- rapporterade dubbelbokningar.

## Nästa steg

- Kontakta Hygglo och fråga om officiellt API, iCal/ICS, partnerintegration eller annan stödd availability-integration.
- Om inget sådant finns: bygg den manuella MVP:n ovan.
- Om officiell integration erbjuds: gör en separat teknisk spike innan implementation.

## Sanity-skydd

Denna utredning kräver inga Sanity-writes, schemaändringar, migreringar eller CMS-dataändringar. En framtida MVP bör i första hand lagra extern availability i Supabase, inte i Sanity.
