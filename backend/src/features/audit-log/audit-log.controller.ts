import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { AuditLogService } from './audit-log.service';
import {
  GetApiAdminAuditLogResponseDto,
  PostApiAdminAuditLogResponseDto,
} from './audit-log.dto';

@ApiTags('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin')
export class AuditLogController {
  constructor(private readonly auditlog: AuditLogService) {}

  /** GET /api/admin/audit-log — AuditEntry records in chronological order. */
  @Get('audit-log')
  async getApiAdminAuditLog(): Promise<GetApiAdminAuditLogResponseDto[]> {
    return this.auditlog.list();
  }

  /** POST /api/admin/audit-log — record an AuditEntry; 201 with the created record. */
  @Post('audit-log')
  @HttpCode(201)
  async postApiAdminAuditLog(@Body() body: unknown): Promise<PostApiAdminAuditLogResponseDto & { userId: string }> {
    return this.auditlog.create(body);
  }
}
