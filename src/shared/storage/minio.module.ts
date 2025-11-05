import {
  NestMinioOptions,
  NestMinioOptionsAsync,
} from '@/common/interfaces/minio.interface';
import { DynamicModule, Global, Module, OnModuleInit } from '@nestjs/common';
import { MINIO_CONFIGURATION_OPTIONS } from '@/constants/minio.constant';
import { NestMinioService } from './minio.service';
import { connectionFactory } from './minio.provider';

@Global()
@Module({
  providers: [NestMinioService],
  exports: [NestMinioService],
})
export class NestMinioModule implements OnModuleInit {
  constructor(readonly service: NestMinioService) {}

  onModuleInit() {
    this.service.checkConnection();
  }

  static forRoot(options: NestMinioOptions): DynamicModule {
    const minioModuleOptions = {
      provide: MINIO_CONFIGURATION_OPTIONS,
      useValue: options,
    };

    return {
      module: NestMinioModule,
      providers: [minioModuleOptions, connectionFactory],
      exports: [NestMinioService, connectionFactory],
    };
  }

  static forRootAsync(options: NestMinioOptionsAsync): DynamicModule {
    const minioModuleOptions = {
      provide: MINIO_CONFIGURATION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: NestMinioModule,
      imports: options.imports,
      providers: [minioModuleOptions, connectionFactory],
      exports: [NestMinioService, connectionFactory],
    };
  }
}
