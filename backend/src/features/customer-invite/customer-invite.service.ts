import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiAdminCustomersResponseDto,
  PostApiAdminCustomersInviteResponseDto,
} from './customer-invite.dto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class CustomerInviteService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Customer', 'User']);
  }

  async list(): Promise<GetApiAdminCustomersResponseDto[]> {
    const rows = await this.prisma.customer.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((c) => ({ id: c.id, email: c.email }));
  }

  async invite(rawEmail: unknown): Promise<PostApiAdminCustomersInviteResponseDto> {
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Customer already exists');
    }

    try {
      let user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: { email, role: UserRole.CUSTOMER, passwordHash: null },
        });
      }
      const customer = await this.prisma.customer.create({
        data: { email, userId: user.id },
      });
      return { customerId: customer.id, email, invitationSent: true };
    } catch (err: unknown) {
      if ((err as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException('Customer already exists');
      }
      throw err;
    }
  }
}
