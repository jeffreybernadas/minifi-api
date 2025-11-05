import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { ResendConfig } from './resend-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  EMAIL_SENDER: string;

  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY: string;
}

export function getConfig(): ResendConfig {
  return {
    sender: process.env.EMAIL_SENDER as string,
    apiKey: process.env.RESEND_API_KEY as string,
  };
}

export default registerAs<ResendConfig>('resend', () => {
  console.info(`Registering ResendConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
