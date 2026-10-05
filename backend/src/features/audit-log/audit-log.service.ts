import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntryView {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

const SELECT = { id: true, action: true, userId: true, createdAt: true } as const;

function toView(row: { id: string; action: string; userId: string; createdAt: Date }): AuditEntryView {
  return {
    id: row.id,
    action: row.action,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditLogService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['AuditEntry'] as const);
  }

  /** All AuditEntry records, oldest first (chronological order). */
  async list(): Promise<AuditEntryView[]> {
    const rows = await this.model('AuditEntry').findMany({
      orderBy: { createdAt: 'asc' },
      select: SELECT,
    });
    return rows.map(toView);
  }

  /** Validate and store a new AuditEntry, returning the created record. */
  async create(body: unknown): Promise<AuditEntryView> {
    const input = (body ?? {}) as Record<string, unknown>;
    const action = typeof input.action === 'string' ? input.action.trim() : '';
    const userId = typeof input.userId === 'string' ? input.userId.trim() : '';
    if (!action) throw new BadRequestException('action is required');
    if (!userId) throw new BadRequestException('userId is required');
    const row = await this.model('AuditEntry').create({
      data: { action, userId },
      select: SELECT,
    });
    return toView(row);
  }
}
