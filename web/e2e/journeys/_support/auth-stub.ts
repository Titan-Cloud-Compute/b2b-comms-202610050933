/**
 * Hermetic auth stub for the journey specs: every /api/** call is answered
 * here so nothing reaches the network. POST /api/auth/login resolves the role
 * from the seeded demo email; POST /api/auth/signup creates a CUSTOMER.
 */
import type { Page } from '@playwright/test';

const SEEDED_ROLES: Record<string, string> = {
  'admin@b2b-portal.example.com': 'ADMIN',
  'vendor@acme.example.com': 'VENDOR',
  'buyer@corp.example.com': 'CUSTOMER',
};

export async function stubAuthApi(page: Page): Promise<void> {
  let user: { id: string; email: string; role: string } | null = null;

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const apiPath = new URL(req.url()).pathname
      .replace(/^.*\/api\//, '')
      .replace(/^\//, '');
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const body = (() => {
      try {
        return (req.postDataJSON() ?? {}) as { email?: string; password?: string };
      } catch {
        return {};
      }
    })();

    // api/auth/login
    if (method === 'POST' && apiPath === 'auth/login') {
      const email = String(body.email ?? '').toLowerCase();
      const role = SEEDED_ROLES[email];
      if (!role || !body.password) return json({ message: 'Unauthorized' }, 401);
      user = { id: `seed-${role.toLowerCase()}`, email, role };
      return json(user);
    }
    // api/auth/signup
    if (method === 'POST' && apiPath === 'auth/signup') {
      const email = String(body.email ?? '').toLowerCase();
      if (!email || !body.password) return json({ message: 'Bad Request' }, 400);
      user = { id: 'new-customer', email, role: 'CUSTOMER' };
      return json(user, 201);
    }
    if (method === 'GET' && (apiPath === 'users/me' || apiPath === 'auth/me')) {
      return user ? json(user) : json({ message: 'Unauthorized' }, 401);
    }
    if (method === 'GET') return json([]);
    return json({ ok: true });
  });
}
