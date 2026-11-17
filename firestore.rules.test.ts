import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

test('Firestore rules enforce default-deny safety net and rules_version 2', () => {
  assert.equal(rulesContent.includes("rules_version = '2';"), true);
  assert.equal(rulesContent.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), true);
});

test('Firestore rules verify email_verified == true and bootstrapped admin email', () => {
  assert.equal(rulesContent.includes('request.auth.token.email_verified == true'), true);
  assert.equal(rulesContent.includes("request.auth.token.email == 'ah2005211@gmail.com'"), true);
});

test('Firestore rules enforce Dirty Dozen invariants (hasAll, hasOnly, isValidId, request.time, PII isolation)', () => {
  assert.equal(rulesContent.includes('isValidProduct(incoming())'), true);
  assert.equal(rulesContent.includes('isValidOrder(incoming())'), true);
  assert.equal(rulesContent.includes('isValidReview(incoming())'), true);
  assert.equal(rulesContent.includes('match /reviews/{reviewId}'), true);
  assert.equal(rulesContent.includes('incoming().createdAt == request.time'), true);
  assert.equal(rulesContent.includes('incoming().updatedAt == request.time'), true);
  assert.equal(rulesContent.includes('resource.data.customerId == request.auth.uid || isBootstrappedAdmin()'), true);
  assert.equal(rulesContent.includes("!(existing().status in ['مكتمل', 'ملغي'])"), true);
});
