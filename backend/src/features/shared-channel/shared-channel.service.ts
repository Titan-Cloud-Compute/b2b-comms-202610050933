import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiChannelsResponseDto,
  PostApiChannelsIdMessagesResponseDto,
  PostApiChannelsResponseDto,
} from './shared-channel.dto';

@Injectable()
export class SharedChannelService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Channel', 'Message'] as const);
  }

  /** Vendor creates a shared channel owned by its VendorProfile. */
  async createChannel(userId: string, name: string): Promise<PostApiChannelsResponseDto> {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) throw new BadRequestException('name is required');
    const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('A vendor profile is required to create channels');
    const channel = await this.prisma.channel.create({
      data: { name: trimmed, vendorId: profile.id, vendorProfileId: profile.id },
    });
    return { id: channel.id, name: channel.name };
  }

  /** Vendors see their own channels; customers see every shared channel. */
  async listChannels(userId: string, role: string): Promise<GetApiChannelsResponseDto[]> {
    let where: { vendorId?: string } = {};
    if (role === 'VENDOR') {
      const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
      if (!profile) return [];
      where = { vendorId: profile.id };
    }
    const channels = await this.prisma.channel.findMany({ where, orderBy: { createdAt: 'desc' } });
    return channels.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  }

  /** Vendor (owner) or customer posts a message in a channel. */
  async postMessage(
    userId: string,
    role: string,
    channelId: string,
    body: string,
  ): Promise<PostApiChannelsIdMessagesResponseDto> {
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) throw new BadRequestException('body is required');
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (role === 'VENDOR') {
      const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
      if (!profile || profile.id !== channel.vendorId) {
        throw new ForbiddenException('Not a member of this channel');
      }
    }
    const message = await this.prisma.message.create({
      data: { body: text, channelId: channel.id, senderId: userId },
    });
    return { id: message.id, body: message.body, channelId: message.channelId };
  }
}
