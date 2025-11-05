import { MINIO_CONNECTION } from '@/constants/minio.constant';
import { INestMinioService, NestMinioService } from './minio.service';

export const connectionFactory = {
  provide: MINIO_CONNECTION,
  useFactory: (nestMinioService: INestMinioService) => {
    return nestMinioService.getMinio();
  },
  inject: [NestMinioService],
};
