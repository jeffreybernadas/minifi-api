import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { SentryConfig } from './sentry-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  SENTRY_DSN: string;
}

export function getConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN!,
  };
}

export default registerAs<SentryConfig>('sentry', () => {
  console.info(`Registering SentryConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
