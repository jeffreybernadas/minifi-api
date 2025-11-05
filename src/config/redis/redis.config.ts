import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RedisConfig } from './redis-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_USERNAME: string;

  @IsBoolean()
  @IsOptional()
  REDIS_PASSWORD: boolean;
}

export function getConfig(): RedisConfig {
  return {
    url: process.env.REDIS_URL as string,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT as string, 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  };
}

export default registerAs<RedisConfig>('redis', () => {
  console.info(`Registering RedisConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
