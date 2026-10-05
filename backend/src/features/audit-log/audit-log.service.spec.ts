import { BadRequestException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { PrismaService } from '../../prisma/prisma.service';

function makePrisma() {
  const rows: { id: string; action: string; userId: string; createdAt: Date }[] = [];
  const auditEntry = {
    findMany: jest.fn(async (args: { orderBy: { createdAt: 'asc' | 'desc' } }) => {
      const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return args.orderBy.createdAt === 'asc' ? sorted : sorted.reverse();
    }),
    create: jest.fn(async ({ data }: { data: { action: string; userId: string } }) => {
      const row = { id: `id-${rows.length + 1}`, ...data, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, rows.length)) };
      rows.push(row);
      return row;
    }),
  };
  return { prisma: { auditEntry } as unknown as PrismaService, auditEntry, rows };
}

describe('AuditLogService', () => {
  it('stores an AuditEntry and returns the created record', async () => {
    const { prisma, auditEntry } = makePrisma();
    const svc = new AuditLogService(prisma);
    const created = await svc.create({ action: 'login', userId: 'u1' });
    expect(auditEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: { action: 'login', userId: 'u1' } }));
    expect(created).toEqual({ id: 'id-1', action: 'login', userId: 'u1', createdAt: expect.any(String) });
  });

  it('rejects a missing action or userId', async () => {
    const svc = new AuditLogService(makePrisma().prisma);
    await expect(svc.create({ userId: 'u1' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create({ action: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists entries in chronological order', async () => {
    const { prisma, auditEntry } = makePrisma();
    const svc = new AuditLogService(prisma);
    await svc.create({ action: 'first', userId: 'u1' });
    await svc.create({ action: 'second', userId: 'u2' });
    const list = await svc.list();
    expect(auditEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: 'asc' } }));
    expect(list.map((e) => e.action)).toEqual(['first', 'second']);
  });
});

describe('AuditLogController routes', () => {
  it('is mounted at /api/admin/audit-log', () => {
    expect(Reflect.getMetadata('path', AuditLogController)).toBe('api/admin');
    expect(Reflect.getMetadata('path', AuditLogController.prototype.getApiAdminAuditLog)).toBe('audit-log');
    expect(Reflect.getMetadata('path', AuditLogController.prototype.postApiAdminAuditLog)).toBe('audit-log');
    expect(Reflect.getMetadata('__httpCode__', AuditLogController.prototype.postApiAdminAuditLog)).toBe(201);
  });
});
