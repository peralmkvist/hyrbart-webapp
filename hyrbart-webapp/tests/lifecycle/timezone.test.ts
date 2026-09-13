import assert from 'node:assert/strict';
import test from 'node:test';
import { stockholmLocalDateTimeToIso } from '../../lib/timezone.ts';

test('Stockholm winter time converts CET wall clock to UTC', () => {
  assert.equal(stockholmLocalDateTimeToIso('2026-01-15', '12:00'), '2026-01-15T11:00:00.000Z');
});

test('Stockholm summer time converts CEST wall clock to UTC', () => {
  assert.equal(stockholmLocalDateTimeToIso('2026-07-15', '12:00'), '2026-07-15T10:00:00.000Z');
});

test('dates around DST season boundaries use the correct offset', () => {
  assert.equal(stockholmLocalDateTimeToIso('2026-03-28', '12:00'), '2026-03-28T11:00:00.000Z');
  assert.equal(stockholmLocalDateTimeToIso('2026-03-30', '12:00'), '2026-03-30T10:00:00.000Z');
  assert.equal(stockholmLocalDateTimeToIso('2026-10-24', '12:00'), '2026-10-24T10:00:00.000Z');
  assert.equal(stockholmLocalDateTimeToIso('2026-10-26', '12:00'), '2026-10-26T11:00:00.000Z');
});
