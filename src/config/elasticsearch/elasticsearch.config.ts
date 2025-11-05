import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ElasticSearchConfig } from './elasticsearch-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  ELASTIC_SEARCH_URL: string;

  @IsString()
  @IsNotEmpty()
  ELASTIC_APM_SERVER_URL: string;

  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  ELASTIC_APM_ENABLE: number;

  @IsString()
  @IsNotEmpty()
  ELASTIC_APM_SECRET_TOKEN: string;
}

export function getConfig(): ElasticSearchConfig {
  return {
    url: process.env.ELASTIC_SEARCH_URL,
    apmUrl: process.env.ELASTIC_APM_SERVER_URL as string,
    apmEnable: parseInt(process.env.ELASTIC_APM_ENABLE as string, 0),
    apmSecret: process.env.ELASTIC_APM_SECRET_TOKEN,
  };
}

export default registerAs<ElasticSearchConfig>('elasticsearch', () => {
  console.info(`Registering ElasticSearchConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
