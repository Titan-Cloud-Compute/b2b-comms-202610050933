import { BadRequestException } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';

function makePrisma() {
  const rows: any[] = [];
  return {
    rows,
    notificationPreference: {
      findUnique: jest.fn(async ({ where }: any) => rows.find(r => r.userId === where.userId) ?? null),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = rows.find(r => r.userId === where.userId);
        if (existing) return Object.assign(existing, update);
        const row = { id: `np-${rows.length + 1}`, ...create };
        rows.push(row);
        return row;
      }),
    },
  };
}

describe('NotificationPreferencesService', () => {
  it('returns defaults when nothing is stored, then stores and returns the record', async () => {
    const prisma = makePrisma();
    const svc = new NotificationPreferencesService(prisma as any);
    expect(await svc.getForUser('u1')).toEqual({ userId: 'u1', orderAlerts: true, messageAlerts: true });
    const saved = await svc.upsertForUser('u1', { orderAlerts: true, messageAlerts: false });
    expect(saved).toEqual({ userId: 'u1', orderAlerts: true, messageAlerts: false });
    expect(await svc.getForUser('u1')).toEqual(saved);
  });

  it('stores both alert fields as false when disabling all', async () => {
    const prisma = makePrisma();
    const svc = new NotificationPreferencesService(prisma as any);
    await svc.upsertForUser('u1', { orderAlerts: true, messageAlerts: true });
    const saved = await svc.upsertForUser('u1', { orderAlerts: false, messageAlerts: false });
    expect(saved).toEqual({ userId: 'u1', orderAlerts: false, messageAlerts: false });
    expect(prisma.rows).toHaveLength(1);
  });

  it('rejects non-boolean values', async () => {
    const svc = new NotificationPreferencesService(makePrisma() as any);
    await expect(svc.upsertForUser('u1', { orderAlerts: 'yes' as any, messageAlerts: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
