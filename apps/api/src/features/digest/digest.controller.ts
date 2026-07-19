import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigestService } from './digest.service';
import { ApiResponse, DigestDto, DigestQueryParamsSchema } from '@repo/shared';

@Controller('digests')
@UseGuards(JwtAuthGuard)
export class DigestController {
  constructor(private digestService: DigestService) {}

  @Get('today')
  async getToday(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<DigestDto | null>> {
    const digest = await this.digestService.findToday(req.user.id);
    return {
      data: digest,
      message: digest ? 'Digest retrieved' : 'No digest for today',
      error: null,
      success: true,
    };
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() rawQuery: Record<string, unknown>,
  ): Promise<ApiResponse<{ items: DigestDto[]; total: number }>> {
    const queryResult = DigestQueryParamsSchema.safeParse({
      ...rawQuery,
      userId: req.user.id,
    });

    if (!queryResult.success) {
      const issues = queryResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new BadRequestException(`Invalid query: ${issues}`);
    }

    const { skip, take, startDate, endDate } = queryResult.data;
    const result = await this.digestService.findMany({
      userId: req.user.id,
      skip,
      take,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      data: result,
      message: `Retrieved ${result.items.length} digests`,
      error: null,
      success: true,
    };
  }

  @Get(':id')
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ApiResponse<DigestDto>> {
    const digest = await this.digestService.findById(req.user.id, id);

    if (!digest) {
      throw new NotFoundException('Digest not found');
    }

    return {
      data: digest,
      message: 'Digest retrieved',
      error: null,
      success: true,
    };
  }
}
