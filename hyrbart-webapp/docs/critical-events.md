# Kritiska events – SCRUM-84

Status: implementation 14 september 2026.

## Syfte

Hyrbart ska kunna följa aktivering, bokningsfunnel, betalning och operativa avvikelser med stabila server-side events. Eventkontraktet är versionsatt och ska inte bero på klientrendering eller sidvisningar.

## Canonical events

| Event | Ägare | Utlöses av | Obligatoriska properties |
| --- | --- | --- | --- |
| `activation_completed` | Product | Ny profil skapas av auth-sync | `account_status` |
| `booking_created` | Product | Bokning/reservation skapas | `status`, `request_type` |
| `booking_status_changed` | Product | Booking state machine ändrar status | `previous_status`, `new_status`, `actor_role` |
| `payment_captured` | Engineering | Betalningscapture lyckas | `provider`, `amount`, `currency`, `simulated` |
| `deviation_detected` | Operations | Persisted warning/error/critical operational event | `deviation_type`, `source` |

Alla events lagras i `critical_product_events` med `event_version=1`. `actor_id`, `booking_id`, `product_id` och `correlation_id` används när de finns. Personuppgifter och fri text ska inte läggas i properties.

## Idempotens

`idempotency_key` har ett partiellt unique-index. Booking-events använder stabila nycklar, exempelvis `booking_created:<bookingId>`, `booking_status_changed:<bookingId>:<newStatus>` och `payment_captured:<bookingId>:<paymentId>`. Operational deviations använder correlation ID + eventtyp.

## Implementation

- `lib/critical-events.ts` äger kontrakt, required-property validation och insert.
- `lib/booking-events.ts` speglar canonical booking/payment events till critical tracking automatiskt.
- `lib/observability.ts` speglar persisted warning/error/critical till `deviation_detected`.
- Profile-activation fångas av en server-side Postgres-trigger för att undvika klientdubletter.
- Tabellen är server-only: RLS är aktiv, anon/authenticated saknar grants, service role skriver/läser.

## Funneldefinition v1

1. `activation_completed`
2. `booking_created`
3. `booking_status_changed` → `accepted`
4. `payment_captured`
5. `booking_status_changed` → `active`
6. `booking_status_changed` → `completed`

Avvikelsemåttet kan brytas ned på `properties.deviation_type`, `source`, severity och correlation ID.

## QA

För SCRUM-84 ska QA minst verifiera:

- schema accepterar samtliga canonical eventnamn och stoppar okända eventnamn;
- idempotency key stoppar dublettregistrering;
- booking/payment gatewayn bygger i produktion;
- persisted operational warnings/errors producerar deviation-event;
- ny framtida auth-profile producerar exakt ett activation-event;
- inga events kräver Sanity-write.
