import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { KeycloakJWT } from '../user/interfaces/keycloak-jwt.interface';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {
  ApiStandardErrorResponse,
  ApiStandardResponse,
} from '@/decorators/swagger.decorator';
import { TagResponseDto } from './dto/tag-response.dto';

@ApiTags('links')
@ApiBearerAuth('JWT')
@Controller({ path: 'links', version: '1' })
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post('tags')
  @ApiOperation({ summary: 'Create a tag' })
  @ApiStandardResponse({
    status: 201,
    description: 'Tag created successfully',
    type: TagResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  createTag(@AuthenticatedUser() user: KeycloakJWT, @Body() dto: CreateTagDto) {
    return this.tagService.createTag(user.sub, dto);
  }

  @Get('tags')
  @ApiOperation({ summary: 'List tags for current user' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tags retrieved successfully',
    type: TagResponseDto,
    isArray: true,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  getTags(@AuthenticatedUser() user: KeycloakJWT) {
    return this.tagService.getUserTags(user.sub);
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tag updated successfully',
    type: TagResponseDto,
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Tag does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  updateTag(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagService.updateTag(id, user.sub, dto);
  }

  @Delete('tags/:id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tag deleted successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description: 'Not Found - Tag does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  deleteTag(@AuthenticatedUser() user: KeycloakJWT, @Param('id') id: string) {
    return this.tagService.deleteTag(id, user.sub);
  }

  @Post(':linkId/tags/:tagId')
  @ApiOperation({ summary: 'Assign a tag to a link' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tag assigned to link successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description:
      'Not Found - Link or tag does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  addTagToLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('linkId') linkId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tagService.addTagToLink(linkId, tagId, user.sub);
  }

  @Delete(':linkId/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag from a link' })
  @ApiStandardResponse({
    status: 200,
    description: 'Tag removed from link successfully',
  })
  @ApiStandardErrorResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    errorCode: 'UNAUTHORIZED',
  })
  @ApiStandardErrorResponse({
    status: 404,
    description:
      'Not Found - Link or tag does not exist or user is not the owner',
    errorCode: 'NOT_FOUND',
  })
  removeTagFromLink(
    @AuthenticatedUser() user: KeycloakJWT,
    @Param('linkId') linkId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tagService.removeTagFromLink(linkId, tagId, user.sub);
  }
}
