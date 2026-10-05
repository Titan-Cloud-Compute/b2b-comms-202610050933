import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SharedChannelService } from './shared-channel.service';

function makePrisma() {
  const channels: any[] = [];
  const messages: any[] = [];
  return {
    channels,
    messages,
    vendorProfile: { findUnique: jest.fn(async ({ where }: any) => (where.userId === 'vend-user' ? { id: 'vp-1' } : null)) },
    channel: {
      create: jest.fn(async ({ data }: any) => {
        const c = { id: `c-${channels.length + 1}`, ...data };
        channels.push(c);
        return c;
      }),
      findUnique: jest.fn(async ({ where }: any) => channels.find(c => c.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) =>
        channels.filter(c => !where?.vendorId || c.vendorId === where.vendorId)),
    },
    message: {
      create: jest.fn(async ({ data }: any) => {
        const m = { id: `m-${messages.length + 1}`, ...data };
        messages.push(m);
        return m;
      }),
    },
  };
}

describe('SharedChannelService', () => {
  it('vendor creates a channel listed for vendor and customer; customer posts a message', async () => {
    const prisma = makePrisma();
    const svc = new SharedChannelService(prisma as any);
    const created = await svc.createChannel('vend-user', 'Acme x Corp');
    expect(created).toEqual({ id: 'c-1', name: 'Acme x Corp' });
    expect(prisma.channels[0].vendorId).toBe('vp-1');

    expect(await svc.listChannels('vend-user', 'VENDOR')).toEqual([{ id: 'c-1', name: 'Acme x Corp' }]);
    expect(await svc.listChannels('cust-user', 'CUSTOMER')).toEqual([{ id: 'c-1', name: 'Acme x Corp' }]);

    const msg = await svc.postMessage('cust-user', 'CUSTOMER', 'c-1', 'Hello vendor');
    expect(msg).toEqual({ id: 'm-1', body: 'Hello vendor', channelId: 'c-1' });
    expect(prisma.messages[0].senderId).toBe('cust-user');
  });

  it('rejects channel creation without a vendor profile and messages to unknown channels', async () => {
    const prisma = makePrisma();
    const svc = new SharedChannelService(prisma as any);
    await expect(svc.createChannel('cust-user', 'X')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.postMessage('cust-user', 'CUSTOMER', 'nope', 'hi')).rejects.toBeInstanceOf(NotFoundException);
  });
});
