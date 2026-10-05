import { Body, Controller, Get, HttpCode, HttpStatus, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import type { PutApiNotificationsPreferencesRequestDto } from './notification-preferences.dto';

@ApiTags('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR, UserRole.CUSTOMER)
@Controller('api/notifications')
export class NotificationPreferencesController {
  constructor(private readonly notificationpreferences: NotificationPreferencesService) {}

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  async putApiNotificationsPreferences(
    @Req() req: Request,
    @Body() body: PutApiNotificationsPreferencesRequestDto,
  ) {
    return this.notificationpreferences.upsertForUser(req.session!.userId, body);
  }

  @Get('preferences')
  async getApiNotificationsPreferences(@Req() req: Request) {
    return this.notificationpreferences.getForUser(req.session!.userId);
  }
}
