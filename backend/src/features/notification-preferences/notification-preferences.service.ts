import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiNotificationsPreferencesResponseDto,
  PutApiNotificationsPreferencesRequestDto,
  PutApiNotificationsPreferencesResponseDto,
} from './notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['NotificationPreference'] as const);
  }

  /** Returns the caller's stored preferences, or defaults (both on) when none exist yet. */
  async getForUser(userId: string): Promise<GetApiNotificationsPreferencesResponseDto> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!row) return { userId, orderAlerts: true, messageAlerts: true };
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }

  /** Creates or updates the caller's preferences and returns the stored record. */
  async upsertForUser(
    userId: string,
    dto: PutApiNotificationsPreferencesRequestDto,
  ): Promise<PutApiNotificationsPreferencesResponseDto> {
    const orderAlerts = dto?.orderAlerts;
    const messageAlerts = dto?.messageAlerts;
    if (typeof orderAlerts !== 'boolean' || typeof messageAlerts !== 'boolean') {
      throw new BadRequestException('orderAlerts and messageAlerts must be booleans');
    }
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, orderAlerts, messageAlerts },
      update: { orderAlerts, messageAlerts },
    });
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }
}
