import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomerInviteService } from './customer-invite.service';

function makePrisma() {
  const customers: { id: string; email: string; userId: string; createdAt: Date }[] = [];
  const users: { id: string; email: string; role: string }[] = [];
  let seq = 0;
  return {
    customers,
    customer: {
      findMany: jest.fn(async () => [...customers]),
      findUnique: jest.fn(async ({ where }: any) => customers.find((c) => c.email === where.email) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `c${++seq}`, createdAt: new Date(), ...data };
        customers.push(row);
        return row;
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.email === where.email) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `u${++seq}`, ...data };
        users.push(row);
        return row;
      }),
    },
  };
}

describe('CustomerInviteService', () => {
  it('creates a customer and returns invitationSent true', async () => {
    const prisma = makePrisma();
    const svc = new CustomerInviteService(prisma as any);
    const res = await svc.invite('  New@Corp.example.com ');
    expect(res).toEqual({ customerId: expect.any(String), email: 'new@corp.example.com', invitationSent: true });
    expect(prisma.customers).toHaveLength(1);
    expect(await svc.list()).toEqual([{ id: res.customerId, email: 'new@corp.example.com' }]);
  });

  it('rejects a duplicate invite with 409', async () => {
    const prisma = makePrisma();
    const svc = new CustomerInviteService(prisma as any);
    await svc.invite('dup@corp.example.com');
    await expect(svc.invite('dup@corp.example.com')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an invalid email with 400', async () => {
    const svc = new CustomerInviteService(makePrisma() as any);
    await expect(svc.invite('not-an-email')).rejects.toBeInstanceOf(BadRequestException);
  });
});
