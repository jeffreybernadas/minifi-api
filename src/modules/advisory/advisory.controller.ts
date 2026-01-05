import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@/shared/guards/admin.guard';
import {
  ApiStandardResponse,
  ApiStandardErrorResponse,
  ApiPaginatedResponse,
} from '@/decorators/swagger.decorator';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination';
import { AdvisoryService } from './advisory.service';
import {
  CreateAdvisoryDto,
  UpdateAdvisoryDto,
  AdvisoryResponseDto,
  AdvisoryListResponseDto,
  AdvisoryFilterDto,
} from './dto';

@ApiTags('admin/advisories')
@ApiBearerAuth('JWT')
@UseGuards(AdminGuard)
@Controller({ path: 'admin/advisories', version: '1' })
export class AdvisoryController {
  constructor(private readonly advisoryService: AdvisoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an advisory',
    description:
      'Creates a new advisory in DRAFT status. Use the publish endpoint to make it visible to users.',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Advisory created successfully',
    type: AdvisoryResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid input data',
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
  create(@Body() dto: CreateAdvisoryDto): Promise<AdvisoryResponseDto> {
    return this.advisoryService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all advisories',
    description:
      'Returns a paginated list of all advisories with optional filtering by status and type.',
  })
  @ApiPaginatedResponse(AdvisoryListResponseDto)
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
  findAll(
    @Query() filters: AdvisoryFilterDto,
  ): Promise<OffsetPaginatedDto<AdvisoryListResponseDto>> {
    return this.advisoryService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get advisory details',
    description: 'Returns detailed information about a specific advisory.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory details retrieved successfully',
    type: AdvisoryResponseDto,
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
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  findOne(@Param('id') id: string): Promise<AdvisoryResponseDto> {
    return this.advisoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an advisory',
    description:
      'Updates advisory properties including title, content, type, and expiration.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory updated successfully',
    type: AdvisoryResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Invalid update data',
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
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdvisoryDto,
  ): Promise<AdvisoryResponseDto> {
    return this.advisoryService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publish an advisory',
    description:
      'Publishes an advisory, making it visible to users. Sets publishedAt to now.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory published successfully',
    type: AdvisoryResponseDto,
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
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  publish(@Param('id') id: string): Promise<AdvisoryResponseDto> {
    return this.advisoryService.publish(id);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive an advisory',
    description:
      'Archives an advisory, hiding it from users without deleting it.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory archived successfully',
    type: AdvisoryResponseDto,
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
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  archive(@Param('id') id: string): Promise<AdvisoryResponseDto> {
    return this.advisoryService.archive(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an advisory',
    description:
      'Permanently deletes an advisory and all associated dismissal records.',
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Advisory deleted successfully',
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
    description: 'Advisory not found',
    errorCode: 'NOT_FOUND',
  })
  delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.advisoryService.delete(id);
  }
}
