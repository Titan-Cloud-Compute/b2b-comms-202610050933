import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateOrderItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class OrderManagementService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Order', 'OrderItem'] as const);
  }

  /** Customer places an order; stored with status "pending". */
  async createOrder(userId: string, vendorId: string, items: CreateOrderItemInput[] = []) {
    if (!vendorId) throw new BadRequestException('vendorId is required');
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException('Only customers can place orders');
    const order = await this.model('Order').create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId,
        orderItems: {
          create: (items ?? []).map(i => ({
            description: String(i.description ?? ''),
            quantity: Math.trunc(Number(i.quantity)),
            unitPrice: Number(i.unitPrice),
          })),
        },
      },
    });
    return { id: order.id, status: order.status, customerId: order.customerId };
  }

  /** Vendor confirms one of its pending orders. */
  async confirmOrder(userId: string, orderId: string, estimatedDelivery: string) {
    if (!estimatedDelivery || isNaN(Date.parse(estimatedDelivery))) {
      throw new BadRequestException('estimatedDelivery must be a date');
    }
    const order = await this.model('Order').findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || (order.vendorId !== vendor.id && order.vendorId !== userId)) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== 'pending') throw new BadRequestException('Order is not pending');
    const updated = await this.model('Order').update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });
    return { id: updated.id, status: updated.status };
  }

  /** Orders visible to the session user (customer's own, or vendor's queue). */
  async listOrders(userId: string) {
    const [customer, vendor] = await Promise.all([
      this.prisma.customer.findUnique({ where: { userId } }),
      this.prisma.vendorProfile.findUnique({ where: { userId } }),
    ]);
    const or: Array<Record<string, string>> = [];
    if (customer) or.push({ customerId: customer.id });
    if (vendor) or.push({ vendorId: vendor.id }, { vendorId: userId });
    if (or.length === 0) return [];
    const orders = await this.model('Order').findMany({
      where: { OR: or },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(o => ({ id: o.id, status: o.status, customerId: o.customerId, vendorId: o.vendorId }));
  }
}
