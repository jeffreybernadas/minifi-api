import { Injectable, Inject } from '@nestjs/common';
import * as minio from 'minio';
import { from, lastValueFrom, retry } from 'rxjs';
import { NestMinioOptions } from '@/common/interfaces/minio.interface';
import { MINIO_CONFIGURATION_OPTIONS } from '@/constants/minio.constant';
import { LoggerService } from '@/shared/logger/logger.service';

export interface INestMinioService {
  getMinio(): minio.Client;
}

@Injectable()
export class NestMinioService implements INestMinioService {
  private _minioConnection: minio.Client;

  constructor(
    @Inject(MINIO_CONFIGURATION_OPTIONS)
    private readonly nestMinioOptions: NestMinioOptions,
    private readonly logger: LoggerService,
  ) {}

  getMinio(): minio.Client {
    if (!this._minioConnection) {
      const { ...options } = this.nestMinioOptions;
      this._minioConnection = new minio.Client(options);
    }
    return this._minioConnection;
  }

  checkConnection() {
    const { retries = 5, retryDelay = 1000 } = this.nestMinioOptions;

    lastValueFrom(
      from(this._minioConnection.listBuckets()).pipe(
        retry({ count: retries, delay: retryDelay }),
      ),
    )
      .then(() => {
        this.logger.log('Successfully connected to Minio.', 'Minio');
      })
      .catch((error) => {
        this.logger.error(error as string, 'Minio');
      });
  }
}
