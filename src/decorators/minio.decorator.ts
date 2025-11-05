import { Inject } from '@nestjs/common';
import { MINIO_CONNECTION } from '@/constants/minio.constant';

export const InjectMinio = () => Inject(MINIO_CONNECTION);
