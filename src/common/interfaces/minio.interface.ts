import { ClientOptions } from 'minio';
import { ModuleMetadata } from '@nestjs/common';

export interface NestMinioOptions extends ClientOptions {
  retries?: number;
  retryDelay?: number;
}

export interface NestMinioOptionsAsync extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useFactory: (...args: any[]) => NestMinioOptions | Promise<NestMinioOptions>;
  inject?: any[];
}
