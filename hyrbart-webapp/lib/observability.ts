import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordCriticalEvent } from '@/lib/critical-events';

export type OperationalSeverity = 'info'|'warning'|'error'|'critical';

type OperationalEvent = {
  correlationId: string;
  severity: OperationalSeverity;
  eventType: string;
  source: string;
  route?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  persist?: boolean;
};

const BLOCKED_KEYS = /password|secret|token|authorization|cookie|email|phone|address|message_body|body|description|reason|file_?name|filename|attachment|query_text|place|latitude|longitude|(^|_)lat$|(^|_)lng$/i;

function sanitizeText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted-phone]')
    .slice(0, 500);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]';
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = BLOCKED_KEYS.test(key) ? '[redacted]' : sanitize(item, depth + 1);
    }
    return out;
  }
  return sanitizeText(String(value));
}

export function correlationIdFromRequest(request: Request) {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

export function errorSummary(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: sanitizeText(error.message) };
  return { message: sanitizeText(String(error)) };
}

export async function logOperationalEvent(event: OperationalEvent) {
  const timestamp = new Date().toISOString();
  const metadata = sanitize(event.metadata ?? {}) as Record<string, unknown>;
  const safeMessage = sanitizeText(event.message);
  const payload = {
    ts: timestamp,
    kind: 'hyrbart_operational_event',
    correlation_id: event.correlationId,
    severity: event.severity,
    event_type: event.eventType,
    source: event.source,
    route: event.route ?? null,
    entity_type: event.entityType ?? null,
    entity_id: event.entityId ?? null,
    message: safeMessage,
    metadata,
  };
  const encoded = JSON.stringify(payload);
  if (event.severity === 'critical' || event.severity === 'error') console.error(encoded);
  else if (event.severity === 'warning') console.warn(encoded);
  else console.info(encoded);

  const persist = event.persist ?? event.severity !== 'info';
  if (!persist) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('operational_events').insert({
      correlation_id: event.correlationId,
      severity: event.severity,
      event_type: event.eventType,
      source: event.source,
      route: event.route ?? null,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      message: safeMessage.slice(0, 1000),
      metadata,
    });
    if (error) console.error(JSON.stringify({ ts: timestamp, kind: 'hyrbart_observability_write_failed', correlation_id: event.correlationId, error: sanitizeText(error.message) }));

    if (event.severity !== 'info') {
      try {
        await recordCriticalEvent({
          eventName: 'deviation_detected',
          bookingId: event.entityType === 'booking' ? event.entityId ?? null : null,
          correlationId: event.correlationId,
          idempotencyKey: `deviation_detected:${event.correlationId}:${event.eventType}`,
          properties: {
            deviation_type: event.eventType,
            source: event.source,
            severity: event.severity,
            route: event.route ?? null,
            entity_type: event.entityType ?? null,
          },
        });
      } catch (criticalError) {
        console.error(JSON.stringify({ ts: timestamp, kind: 'hyrbart_critical_event_write_failed', correlation_id: event.correlationId, error: errorSummary(criticalError) }));
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ ts: timestamp, kind: 'hyrbart_observability_write_failed', correlation_id: event.correlationId, error: errorSummary(error) }));
  }
}
