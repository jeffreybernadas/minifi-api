import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  IsBoolean,
} from 'class-validator';
import { WebSocketConfig } from './websocket-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(0)
  @Max(65535)
  @IsNotEmpty()
  WEBSOCKET_PORT: number;

  @IsString()
  @IsNotEmpty()
  WEBSOCKET_PATH: string;

  @IsString()
  @IsNotEmpty()
  WEBSOCKET_CORS_ORIGIN: string;

  @IsBoolean()
  WEBSOCKET_CORS_CREDENTIALS: boolean;

  @IsInt()
  @Min(1000)
  WEBSOCKET_PING_TIMEOUT: number;

  @IsInt()
  @Min(1000)
  WEBSOCKET_PING_INTERVAL: number;

  @IsInt()
  @Min(1024)
  WEBSOCKET_MAX_HTTP_BUFFER_SIZE: number;

  @IsString()
  @IsNotEmpty()
  WEBSOCKET_TRANSPORTS: string;
}

export function getConfig(): WebSocketConfig {
  const corsOrigin = process.env.WEBSOCKET_CORS_ORIGIN as string;
  const transports = process.env.WEBSOCKET_TRANSPORTS as string;

  return {
    port: parseInt(process.env.WEBSOCKET_PORT as string, 10),
    path: process.env.WEBSOCKET_PATH as string,
    cors: {
      origin: corsOrigin.includes(',')
        ? corsOrigin.split(',').map((origin) => origin.trim())
        : corsOrigin,
      credentials: process.env.WEBSOCKET_CORS_CREDENTIALS === 'true',
    },
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT as string, 10),
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL as string, 10),
    maxHttpBufferSize: parseInt(
      process.env.WEBSOCKET_MAX_HTTP_BUFFER_SIZE as string,
      10,
    ),
    transports: transports.split(',').map((transport) => transport.trim()),
  };
}

export default registerAs<WebSocketConfig>('websocket', () => {
  console.info(`Registering WebSocketConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
