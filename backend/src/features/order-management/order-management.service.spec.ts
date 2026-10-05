import { ForbiddenException } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';

function makePrisma() {
  const orders: any[] = [];
  return {
    orders,
    customer: { findUnique: jest.fn(async ({ where }: any) => (where.userId === 'cust-user' ? { id: 'cust-1' } : null)) },
    vendorProfile: { findUnique: jest.fn(async ({ where }: any) => (where.userId === 'vend-user' ? { id: 'vend-1' } : null)) },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const o = { id: `o-${orders.length + 1}`, status: data.status, customerId: data.customerId, vendorId: data.vendorId };
        orders.push(o);
        return o;
      }),
      findUnique: jest.fn(async ({ where }: any) => orders.find(o => o.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(orders.find(o => o.id === where.id), data)),
      findMany: jest.fn(async () => orders),
    },
  };
}

describe('OrderManagementService', () => {
  it('creates a pending order for a customer and lets the vendor confirm it', async () => {
    const prisma = makePrisma();
    const svc = new OrderManagementService(prisma as any);
    const created = await svc.createOrder('cust-user', 'vend-1', [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }]);
    expect(created).toEqual({ id: 'o-1', status: 'pending', customerId: 'cust-1' });
    const confirmed = await svc.confirmOrder('vend-user', 'o-1', '2026-12-01');
    expect(confirmed).toEqual({ id: 'o-1', status: 'confirmed' });
    const list = await svc.listOrders('cust-user');
    expect(list[0].status).toBe('confirmed');
  });

  it('rejects non-customers creating orders and other vendors confirming', async () => {
    const prisma = makePrisma();
    const svc = new OrderManagementService(prisma as any);
    await expect(svc.createOrder('vend-user', 'vend-1')).rejects.toBeInstanceOf(ForbiddenException);
    await svc.createOrder('cust-user', 'vend-other');
    await expect(svc.confirmOrder('vend-user', 'o-1', '2026-12-01')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
