import { registerAs } from '@nestjs/config';
import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { OpenAIConfig } from './openai-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  OPENAI_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  OPENAI_MODEL: string;

  @IsNumber()
  @IsNotEmpty()
  OPENAI_MAX_TOKENS: number;

  @IsNumber()
  @IsNotEmpty()
  OPENAI_TEMPERATURE: number;
}

export function getConfig(): OpenAIConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY as string,
    model: (process.env.OPENAI_MODEL as string) || 'gpt-4o-mini',
    maxTokens: Number.parseInt(
      (process.env.OPENAI_MAX_TOKENS as string) || '1000',
      10,
    ),
    temperature: Number.parseFloat(
      (process.env.OPENAI_TEMPERATURE as string) || '0.7',
    ),
  };
}

export default registerAs<OpenAIConfig>('openai', () => {
  console.info(`Registering OpenAIConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
