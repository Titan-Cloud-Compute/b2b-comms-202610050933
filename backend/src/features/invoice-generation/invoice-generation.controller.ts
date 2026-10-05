import { Body, Controller, Get, Header, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { PostApiInvoicesRequestDto } from './invoice-generation.dto';
import { InvoiceGenerationService } from './invoice-generation.service';

@ApiTags('invoice-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/invoices')
export class InvoiceGenerationController {
  constructor(private readonly invoicegeneration: InvoiceGenerationService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async postApiInvoices(@Body() body: PostApiInvoicesRequestDto) {
    return this.invoicegeneration.create(body);
  }

  @Get(':id/download')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER, UserRole.ADMIN)
  async getApiInvoicesIdDownload(@Param('id') id: string) {
    return this.invoicegeneration.getDownload(id);
  }

  @Get(':id/file')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER, UserRole.ADMIN)
  async getApiInvoicesIdFile(@Param('id') id: string) {
    return this.invoicegeneration.getFile(id);
  }
}
