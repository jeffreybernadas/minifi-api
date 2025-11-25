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
    const bucketName = bucket ?? 'thecodebit';
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
    }
    const folderName = folder ?? 'testUpload';
    const fileName = body.fileName ?? file.originalname;

    const objectName = `${folderName}/${Date.now()}-${fileName}`;
    await this.minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      meta,
    );

    return {
      message: 'File uploaded successfully',
      originalname: file.originalname,
      filename: objectName,
      mimetype: file.mimetype,
      size: file.size,
      path: `${this.configService.getOrThrow('minio.url')}/${bucketName}/${objectName}`,
    };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    meta: ItemBucketMetadata,
    body?: MultipleUploadDto,
    bucket?: string,
    folder?: string,
  ) {
    const bucketName = bucket ?? 'thecodebit';
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
    }
    const folderName = folder ?? 'testUpload';

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
        path: `${this.configService.getOrThrow('minio.url')}/${bucketName}/${objectName}`,
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
