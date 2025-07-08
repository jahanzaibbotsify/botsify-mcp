import { z } from 'zod';
import { BotApiConfig, ServerConfig } from '../types/index.js';

// Environment validation schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BOTSIFY_API_BASE_URL: z.string().url().default('https://dev.botsify.com/api'),
  BOTSIFY_API_KEY: z.string().min(1),
  BOTSIFY_BOT_ID: z.string().min(1),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Parse and validate environment variables
const parseEnvironment = () => {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

// Bot API configuration
export const getBotApiConfig = (): BotApiConfig => {
  const env = parseEnvironment();
  
  return {
    baseUrl: env.BOTSIFY_API_BASE_URL,
    authKey: env.BOTSIFY_API_KEY,
    apikey: env.BOTSIFY_BOT_ID,
    timeout: 60000,
  };
};

// Server configuration
export const getServerConfig = (): ServerConfig => {
  const env = parseEnvironment();
  
  return {
    port: env.PORT,
    useHttp: false, // Will be set by command line args
    logLevel: env.LOG_LEVEL,
    environment: env.NODE_ENV,
  };
};

// Development configuration
export const isDevelopment = (): boolean => {
  const env = parseEnvironment();
  return env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  const env = parseEnvironment();
  return env.NODE_ENV === 'production';
};

export const isTest = (): boolean => {
  const env = parseEnvironment();
  return env.NODE_ENV === 'test';
};

// Configuration validation
export const validateConfig = (): void => {
  try {
    getBotApiConfig();
    getServerConfig();
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}; 