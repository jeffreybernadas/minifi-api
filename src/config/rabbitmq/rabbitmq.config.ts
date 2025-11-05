import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { RabbitMQConfig } from './rabbitmq-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  RABBITMQ_URI: string;
}

export function getConfig(): RabbitMQConfig {
  return {
    uri: process.env.RABBITMQ_URI!,
  };
}

export default registerAs<RabbitMQConfig>('rabbitmq', () => {
  console.info(`Registering RabbitMQConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
