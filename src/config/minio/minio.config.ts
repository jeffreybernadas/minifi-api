import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { MinioStorageConfig } from './minio-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  MINIO_URL: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY: string;
}

export function getConfig(): MinioStorageConfig {
  return {
    url: process.env.MINIO_URL as string,
    accessKey: process.env.MINIO_ACCESS_KEY as string,
    secretKey: process.env.MINIO_SECRET_KEY as string,
  };
}

export default registerAs<MinioStorageConfig>('minio', () => {
  console.info(`Registering MinioStorageConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
