import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ApiResponse, UserDto } from '@repo/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<ApiResponse<UserDto>> {
    const user = await this.userService.getUserById(req.user.id);
    if (!user) {
      return {
        data: {} as UserDto,
        message: 'User not found',
        error: 'User not found',
        success: false,
      };
    }
    
    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      image: user.image,
      isActive: user.isActive,
      digestTime: user.digestTime,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      data: userDto,
      message: 'User profile retrieved successfully',
      error: null,
      success: true,
    };
  }

  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: Partial<UserDto>,
  ): Promise<ApiResponse<UserDto>> {
    const updated = await this.userService.updateUser(req.user.id, updateData as any);
    
    const userDto: UserDto = {
      id: updated.id,
      email: updated.email,
      name: updated.name || undefined,
      image: updated.image,
      isActive: updated.isActive,
      digestTime: updated.digestTime,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return {
      data: userDto,
      message: 'User profile updated successfully',
      error: null,
      success: true,
    };
  }
}
