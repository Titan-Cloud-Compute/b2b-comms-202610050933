import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceGenerationService } from './invoice-generation.service';

function makePrisma() {
  return {
    order: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn(), create: jest.fn() },
  };
}

describe('InvoiceGenerationService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: InvoiceGenerationService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new InvoiceGenerationService(prisma as unknown as PrismaService);
  });

  it('creates an invoice for a confirmed order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
    prisma.invoice.findUnique.mockResolvedValue(null);
    prisma.invoice.create.mockResolvedValue({ id: 'i1', orderId: 'o1', amount: 10.5 });
    await expect(service.create({ orderId: 'o1', amount: 10.5 })).resolves.toEqual({
      id: 'i1',
      orderId: 'o1',
      amount: 10.5,
    });
  });

  it('rejects non-confirmed orders', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'pending' });
    await expect(service.create({ orderId: 'o1', amount: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('404s for a missing order', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.create({ orderId: 'nope', amount: 5 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a downloadUrl for an existing invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue({ id: 'i1', orderId: 'o1', amount: 1 });
    await expect(service.getDownload('i1')).resolves.toEqual({
      id: 'i1',
      downloadUrl: '/api/invoices/i1/file',
    });
  });

  it('404s for a missing invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(service.getDownload('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
