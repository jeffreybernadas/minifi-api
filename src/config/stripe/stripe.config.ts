import { registerAs } from '@nestjs/config';

import validateConfig from '@/utils/config/validate-config.util';
import { IsNotEmpty, IsString } from 'class-validator';
import { StripeConfig } from './stripe-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  STRIPE_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_ACCOUNT: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_ACCOUNT_TEST: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_CONNECT: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_CONNECT_TEST: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_PRO: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_SUCCESS_URL: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_CANCEL_URL: string;
}

export function getConfig(): StripeConfig {
  return {
    apiKey: process.env.STRIPE_API_KEY!,
    account: process.env.STRIPE_ACCOUNT!,
    accountTest: process.env.STRIPE_ACCOUNT_TEST!,
    connect: process.env.STRIPE_CONNECT!,
    connectTest: process.env.STRIPE_CONNECT_TEST!,
    priceIdPro: process.env.STRIPE_PRICE_ID_PRO!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    successUrl: process.env.STRIPE_SUCCESS_URL!,
    cancelUrl: process.env.STRIPE_CANCEL_URL!,
  };
}

export default registerAs<StripeConfig>('stripe', () => {
  console.info(`Registering StripeConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
