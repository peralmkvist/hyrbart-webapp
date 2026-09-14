import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRequiredProfilePhoto } from '../../lib/profile-requirements.ts';

test('profile photo requirement rejects missing and placeholder-style values', () => {
  assert.equal(hasRequiredProfilePhoto(null), false);
  assert.equal(hasRequiredProfilePhoto(undefined), false);
  assert.equal(hasRequiredProfilePhoto(''), false);
  assert.equal(hasRequiredProfilePhoto('   '), false);
  assert.equal(hasRequiredProfilePhoto('P'), false);
  assert.equal(hasRequiredProfilePhoto('/avatar-placeholder.svg'), false);
});

test('profile photo requirement accepts real http and https URLs only', () => {
  assert.equal(hasRequiredProfilePhoto('https://example.com/per.jpg'), true);
  assert.equal(hasRequiredProfilePhoto('http://example.com/per.jpg'), true);
  assert.equal(hasRequiredProfilePhoto('ftp://example.com/per.jpg'), false);
  assert.equal(hasRequiredProfilePhoto('not-a-url'), false);
});
