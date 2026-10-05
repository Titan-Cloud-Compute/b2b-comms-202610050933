import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiInvoicesIdDownloadResponseDto,
  PostApiInvoicesRequestDto,
  PostApiInvoicesResponseDto,
} from './invoice-generation.dto';

@Injectable()
export class InvoiceGenerationService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Invoice', 'Order'] as const);
  }

  async create(body: PostApiInvoicesRequestDto | undefined): Promise<PostApiInvoicesResponseDto> {
    const orderId = body?.orderId;
    const amount = Number(body?.amount);
    if (typeof orderId !== 'string' || orderId.trim() === '') {
      throw new BadRequestException('orderId is required');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }

    const order = await this.model('Order').findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (String(order.status).toLowerCase() !== 'confirmed') {
      throw new BadRequestException('Invoices can only be generated for confirmed orders');
    }

    const existing = await this.model('Invoice').findUnique({ where: { orderId } });
    const invoice =
      existing ?? (await this.model('Invoice').create({ data: { orderId, amount } }));
    return { id: invoice.id, orderId: invoice.orderId, amount: invoice.amount };
  }

  async getDownload(id: string): Promise<GetApiInvoicesIdDownloadResponseDto> {
    const invoice = await this.model('Invoice').findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return { id: invoice.id, downloadUrl: `/api/invoices/${invoice.id}/file` };
  }

  async getFile(id: string): Promise<string> {
    const invoice = await this.model('Invoice').findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return [
      `INVOICE ${invoice.id}`,
      `Order: ${invoice.orderId}`,
      `Amount: ${invoice.amount.toFixed(2)}`,
      `Issued: ${invoice.createdAt.toISOString()}`,
      '',
    ].join('\n');
  }
}
