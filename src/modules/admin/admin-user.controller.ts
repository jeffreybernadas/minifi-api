import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@/shared/guards/admin.guard';
import { AdminUserService } from './admin-user.service';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import {
  AdminUserFilterDto,
  AdminUserResponseDto,
  AdminUserDetailDto,
  ChangeTierDto,
  BlockUserDto,
} from './dto';

@ApiTags('admin/users')
@ApiBearerAuth('JWT')
@UseGuards(AdminGuard)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns a paginated list of all users with optional filtering by user type, blocked status, email verification, and search query.',
  })
  @ApiPaginatedResponse(AdminUserResponseDto)
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  getUsers(
    @Query() filters: AdminUserFilterDto,
  ): Promise<OffsetPaginatedDto<AdminUserResponseDto>> {
    return this.adminUserService.getUsers(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user details',
    description:
      'Returns detailed information about a specific user including subscription details, link counts, and total clicks.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'User details retrieved successfully',
    type: AdminUserDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'NOT_FOUND',
  })
  getUserById(@Param('id') id: string): Promise<AdminUserDetailDto> {
    return this.adminUserService.getUserById(id);
  }

  @Patch(':id/tier')
  @ApiOperation({
    summary: 'Change user subscription tier',
    description:
      'Manually changes a user subscription tier to FREE or PRO. This bypasses Stripe and directly updates the local subscription record.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'User tier changed successfully',
    type: AdminUserDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid tier value',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'NOT_FOUND',
  })
  changeTier(
    @Param('id') id: string,
    @Body() dto: ChangeTierDto,
  ): Promise<AdminUserDetailDto> {
    return this.adminUserService.changeTier(id, dto.tier);
  }

  @Patch(':id/block')
  @ApiOperation({
    summary: 'Block a user',
    description:
      'Blocks a user account with a specified reason. Blocked users cannot access their account or use the platform.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'User blocked successfully',
    type: AdminUserDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid block reason',
    errorCode: 'VALIDATION_ERROR',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'NOT_FOUND',
  })
  blockUser(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
  ): Promise<AdminUserDetailDto> {
    return this.adminUserService.blockUser(id, dto.reason);
  }

  @Patch(':id/unblock')
  @ApiOperation({
    summary: 'Unblock a user',
    description:
      'Removes the block from a user account, restoring their access to the platform.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'User unblocked successfully',
    type: AdminUserDetailDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'NOT_FOUND',
  })
  unblockUser(@Param('id') id: string): Promise<AdminUserDetailDto> {
    return this.adminUserService.unblockUser(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user permanently',
    description:
      'Permanently deletes a user and all their associated data including links, analytics, tags, and subscriptions. This action is irreversible.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    errorCode: 'FORBIDDEN',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'User not found',
    errorCode: 'NOT_FOUND',
  })
  deleteUser(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.adminUserService.deleteUser(id);
  }
}
