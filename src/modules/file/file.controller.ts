import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileService } from './file.service';
import { SingleUploadDto, MultipleUploadDto } from './dto/upload.dto';
import {
  ApiStandardErrorResponse,
  ApiStandardResponse,
} from '@/decorators/swagger.decorator';

@ApiTags('upload')
@ApiBearerAuth('JWT')
@Controller({
  path: 'upload',
  version: '1',
})
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a single file to minio storage',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Created',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '123' },
        originalname: { type: 'string', example: 'original-my-file' },
        filename: { type: 'string', example: 'my-file' },
        mimetype: { type: 'string', example: 'image/jpeg' },
        size: { type: 'string', example: '1.8 KiB' },
        path: { type: 'string', example: 'https://example.com/my-file' },
      },
    },
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Unexpected error',
    errorCode: 'GENERIC_ERROR',
  })
  @ApiBody({ type: SingleUploadDto })
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SingleUploadDto,
  ) {
    return await this.fileService.uploadSingleFile(file, dto, {
      'Content-Type': file.mimetype,
    });
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload multiple files to minio storage',
  })
  @ApiStandardResponse({
    status: 201,
    description: 'Created',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Files uploaded successfully' },
        totalFiles: { type: 'number', example: 3 },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              originalname: { type: 'string', example: 'original-my-file' },
              filename: { type: 'string', example: 'my-file' },
              mimetype: { type: 'string', example: 'image/jpeg' },
              size: { type: 'string', example: '1.8 KiB' },
              path: { type: 'string', example: 'https://example.com/my-file' },
            },
          },
        },
      },
    },
  })
  @ApiStandardErrorResponse({
    status: 400,
    description: 'Unexpected error',
    errorCode: 'GENERIC_ERROR',
  })
  @ApiBody({ type: MultipleUploadDto })
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.fileService.uploadMultipleFiles(files, {
      'Content-Type': 'multipart/form-data',
    });
  }
}
