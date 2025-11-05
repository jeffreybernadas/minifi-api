import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { KeycloakConfig } from './keycloak-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  KEYCLOAK_URL: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_REALM: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_CLIENT_SECRET: string;
}

export function getConfig(): KeycloakConfig {
  return {
    url: process.env.KEYCLOAK_URL!,
    realm: process.env.KEYCLOAK_REALM!,
    clientId: process.env.KEYCLOAK_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
  };
}

export default registerAs<KeycloakConfig>('keycloak', () => {
  console.info(`Registering KeycloakConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
