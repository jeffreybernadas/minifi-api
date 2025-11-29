import { Environment } from '@/constants/app.constant';

export type AppConfig = {
  nodeEnv: `${Environment}`;
  isHttps: boolean;
  name: string;
  appPrefix: string;
  url: string;
  port: number;
  enableUrlScan: boolean;
};
