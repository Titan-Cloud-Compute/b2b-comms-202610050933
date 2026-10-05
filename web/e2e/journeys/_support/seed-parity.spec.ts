/**
 * Parity check: the hermetic auth stub's SEEDED_ROLES must match the
 * journeyAccounts in backend/prisma/seed/seed.js. No browser needed.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const stubPath = path.resolve(__dirname, 'auth-stub.ts');
const seedPath = path.resolve(__dirname, '../../../../backend/prisma/seed/seed.js');

function parseStubRoles(text: string): Map<string, string> {
  const map = new Map<string, string>();
  // Match entries like 'email@example.com': 'ROLE'
  const re = /'([^']+@[^']+)':\s*'([A-Z_]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

function parseSeedJourneyAccounts(text: string): Map<string, string> {
  const map = new Map<string, string>();
  // Match { email: 'x', role: 'Y' } entries inside journeyAccounts block
  const re = /email:\s*'([^']+)'\s*,\s*role:\s*'([A-Z_]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

test('auth stub accounts match backend journey seed', () => {
  const stubText = fs.readFileSync(stubPath, 'utf-8');
  const seedText = fs.readFileSync(seedPath, 'utf-8');

  const stubRoles = parseStubRoles(stubText);
  const seedAccounts = parseSeedJourneyAccounts(seedText);

  // Stub must have at least one entry
  expect(stubRoles.size).toBeGreaterThan(0);

  // Every stub email must appear in the seed with the same role
  for (const [email, role] of stubRoles) {
    expect(
      seedAccounts.has(email),
      `Stub email ${email} not found in seed journeyAccounts`
    ).toBe(true);
    expect(
      seedAccounts.get(email),
      `Stub role for ${email} (${role}) does not match seed role (${seedAccounts.get(email)})`
    ).toBe(role);
  }

  // The three required accounts must be present
  expect(stubRoles.get('admin@b2b-portal.example.com')).toBe('ADMIN');
  expect(stubRoles.get('vendor@acme.example.com')).toBe('VENDOR');
  expect(stubRoles.get('buyer@corp.example.com')).toBe('CUSTOMER');

  // The seed must hash journey accounts with the password "password"
  expect(seedText).toContain("hashSync('password'");
});
