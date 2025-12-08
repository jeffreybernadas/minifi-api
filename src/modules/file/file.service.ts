import { MINIO_CONNECTION } from '@/constants/minio.constant';
import { Inject, Injectable } from '@nestjs/common';
import { Client, ItemBucketMetadata } from 'minio';
import { SingleUploadDto, MultipleUploadDto } from './dto/upload.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileService {
  constructor(
    @Inject(MINIO_CONNECTION) private readonly minioClient: Client,
    private readonly configService: ConfigService,
  ) {}

  async uploadSingleFile(
    file: Express.Multer.File,
    body: SingleUploadDto,
    meta: ItemBucketMetadata,
    bucket?: string,
    folder?: string,
  ) {
    const bucketName = bucket ?? this.configService.getOrThrow('minio.bucket');
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
    }
    const folderName = folder ?? this.configService.getOrThrow('minio.folder');
    const fileName = body.fileName ?? file.originalname;

    const objectName = `${folderName}/${Date.now()}-${fileName}`;
    await this.minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      meta,
    );

    const minioUrl = this.configService.getOrThrow('minio.url', {
      infer: true,
    });
    // Ensure URL has protocol
    const fullUrl = minioUrl.startsWith('http')
      ? minioUrl
      : `https://${minioUrl}`;

    return {
      message: 'File uploaded successfully',
      originalname: file.originalname,
      filename: objectName,
      mimetype: file.mimetype,
      size: file.size,
      path: `${fullUrl}/${bucketName}/${objectName}`,
    };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    meta: ItemBucketMetadata,
    body?: MultipleUploadDto,
    bucket?: string,
    folder?: string,
  ) {
    const bucketName = bucket ?? this.configService.getOrThrow('minio.bucket');
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
    }
    const folderName = folder ?? this.configService.getOrThrow('minio.folder');

    const minioUrl = this.configService.getOrThrow('minio.url');
    // Ensure URL has protocol
    const fullUrl = minioUrl.startsWith('http')
      ? minioUrl
      : `https://${minioUrl}`;

    const uploadPromises = files.map(async (file) => {
      const fileName = file.originalname;
      const objectName = `${folderName}/${Date.now()}-${fileName}`;

      await this.minioClient.putObject(
        bucketName,
        objectName,
        file.buffer,
        file.size,
        meta,
      );

      return {
        originalname: file.originalname,
        filename: objectName,
        mimetype: file.mimetype,
        size: file.size,
        path: `${fullUrl}/${bucketName}/${objectName}`,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    return {
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      totalFiles: uploadedFiles.length,
    };
  }
}
