# Hyrbart notifieringsmatris

Status: launch-underlag för SCRUM-55. Den exekverbara källan är `lib/notification-policy.ts`; detta dokument beskriver produktbeslutet.

## Principer

- **Transaktionella notifieringar** behövs för en aktiv bokning, ett meddelande eller en tidskritisk hämtning/retur. De är alltid synliga i appen när matrisen anger obligatorisk in-app. Externa kanaler kan styras separat där det är rimligt.
- **Valbara produktnotiser** är alltid användarstyrda per kanal.
- Push, e-post och SMS är separata preferenser. SMS-preferens kan sparas innan leverantören är aktiverad; faktisk SMS-leverans hör till SCRUM-56.
- Exakt samma `event_key` får bara skapa en notifiering. Detta är det primära dubblettskyddet.
- Valbara externa notifieringar har kategori-baserad frekvensbegränsning. In-app-historiken kan fortfarande visa händelsen.
- Digest/samlingsutskick är tillåtet endast för kategorier märkta `eligible`; tidskritiska transaktioner får aldrig vänta på digest.

## Matris

| Notistyp | Mottagare | Klass | Prioritet | SLA | App default | Push default | E-post default | SMS default | Extern max/24h | Digest |
|---|---|---|---|---:|---|---|---|---|---:|---|
| Nya följare | Uthyraren | Valbar produkt | Low | 24 h | På | På | Av | Av | 5 | Ja |
| Nya bokningar | Relevant part | Transaktionell | Critical | 2 min | På, obligatorisk | På | På | Av | Ingen throttling | Nej |
| Bokningsändringar/avbokningar | Båda/relevant part | Transaktionell | Critical | 2 min | På, obligatorisk | På | På | Av | Ingen throttling | Nej |
| Nya meddelanden | Motpart i bokning | Transaktionell | High | 5 min | På, obligatorisk | På | Av | Av | Ingen throttling | Nej |
| Nya produkter från följda uthyrare | Följare | Valbar produkt | Low | 24 h | På | Av | Av | Av | 3 | Ja |
| Prisändring på favorit | Favoritägare | Valbar produkt | Normal | 4 h | På | Av | Av | Av | 3 | Ja |
| Sökbevakningsträff | Bevakningsägare | Valbar produkt | Normal | 60 min | På | På | Av | Av | 3 | Ja |
| Hämtning/retur-påminnelse | Relevant part | Transaktionell | High | 5 min | På, obligatorisk | På | På | Av | Ingen throttling | Nej |

## Samtycke och avregistrering

- Preferenser sparas per `user_id + notification_type + channel` i `notification_channel_preferences`.
- Varje ändring audit-loggas i `notification_preference_audit`.
- Valbara kanaler kan slås av/på individuellt i notisinställningarna.
- Obligatorisk in-app för booking, booking_update, message och pickup_return_reminder kan inte stängas av.
- Produkt-/marknadsnära notiser får aldrig kringgå användarens kanalval.

## Dubbletter och frekvens

- `user_notifications.event_key` används som idempotensnyckel. En unikhetskonflikt återanvänder befintlig notifiering och skapar inte en dublett.
- `follower`: max 5 externa leveranser/24 h.
- `followed_host_listing`, `favorite_price_change`, `search_alert`: max 3 externa leveranser/24 h per kategori.
- Boknings-, meddelande- och pickup/return-kategorier frekvensbegränsas inte av denna generella regel eftersom de kan vara tidskritiska. Deras avsändare måste använda stabila event keys.

## Leverans och retry

- Push och e-post använder samma kanalpreferens från matrisen.
- Misslyckade push/e-post-leveranser kan återförsökas upp till tre gånger av befintlig retry-worker.
- Leveransstatus och fel sparas på `user_notifications`.
- SMS är definierad som kanal och preferens men leveransprovider är ännu inte kopplad.

## Privacy

- Meddelanden i booking chat ska inte exponera fri användartext i lock-screen-push. Push-preview använder generisk text enligt SCRUM-54.
- Säkerhets- och personuppgifter ska minimeras i notifieringstext även när själva in-app-destinationen är autentiserad.

## Launch-verifiering

Innan Done/launch:
1. Kontrollera minst ett event från varje kategori mot matrisen.
2. Kontrollera att obligatorisk in-app inte kan stängas av.
3. Kontrollera att valbar push/e-post/SMS-preferens kan sparas separat.
4. Kontrollera samma `event_key` två gånger → en notifiering.
5. Kontrollera frekvensgräns för minst en valbar kategori.
6. När SCRUM-56 aktiverar SMS: verifiera opt-in, opt-out och faktisk leverans utan att ändra matrisens semantik.
