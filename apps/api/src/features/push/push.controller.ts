import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushService } from './push.service';
import { ENV } from '../../config/env';
import {
  type ApiResponse,
  PushSubscribeInputSchema,
  PushUnsubscribeInputSchema,
} from '@repo/shared';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey(): ApiResponse<{ publicKey: string }> {
    return {
      data: { publicKey: ENV.VAPID_PUBLIC_KEY },
      message: 'VAPID public key retrieved',
      error: null,
      success: true,
    };
  }

  @Post('subscribe')
  async subscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<ApiResponse<null>> {
    const result = PushSubscribeInputSchema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new BadRequestException(`Invalid subscription: ${issues}`);
    }

    await this.pushService.saveSubscription(req.user.id, result.data);

    return {
      data: null,
      message: 'Subscribed to push notifications',
      error: null,
      success: true,
    };
  }

  @Post('unsubscribe')
  async unsubscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<ApiResponse<null>> {
    const result = PushUnsubscribeInputSchema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new BadRequestException(`Invalid request: ${issues}`);
    }

    await this.pushService.removeSubscription(
      req.user.id,
      result.data.endpoint,
    );

    return {
      data: null,
      message: 'Unsubscribed from push notifications',
      error: null,
      success: true,
    };
  }
}
