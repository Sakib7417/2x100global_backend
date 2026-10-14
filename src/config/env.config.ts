import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform((val) => parseInt(val, 10)).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform((val) => parseInt(val, 10)).default('0'),
  
  JWT_ACCESS_SECRET: z.string().default('default_jwt_access_secret_change_in_production'),
  JWT_REFRESH_SECRET: z.string().default('default_jwt_refresh_secret_change_in_production'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  BSC_RPC_URL: z.string().default('https://data-seed-prebsc-1-s1.binance.org:8545/'),
  USDT_CONTRACT_ADDRESS: z.string().default('0x1F71139BACbf9Ab15d239342f7783C69951736f7'),
  ADMIN_DEPOSIT_WALLET: z.string().default('0x0000000000000000000000000000000000000000'),
  MINIMUM_DEPOSIT_USDT: z.string().transform((val) => parseFloat(val)).default('100'),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@2x100global.com'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables configuration');
}

export const env = parsedEnv.data;
export default env;
