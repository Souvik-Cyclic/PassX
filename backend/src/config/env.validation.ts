import Joi from 'joi';

export type NodeEnv = 'development' | 'test' | 'production';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/** Every environment variable the backend reads, after validation and defaults. */
export interface EnvVars {
  NODE_ENV: NodeEnv;
  PORT: number;
  MONGO_URI: string;
  MONGO_DB_NAME: string;
  JWT_SECRET: string;
  LOG_LEVEL: LogLevel;
  CORS_ORIGINS: string;
  METRICS_PORT: number;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_SERVICE_NAME: string;
  APP_COMMIT: string;
  APP_IMAGE_TAG: string;
  APP_BUILD_TIME: string;
  APP_PIPELINE_URL: string;
  POD_NAME: string;
  NODE_NAME: string;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  THROTTLE_AUTH_LIMIT: number;
  BREAK_READINESS: boolean;
}

const unknown = Joi.string().default('unknown');

export const validationSchema: Joi.ObjectSchema<EnvVars> = Joi.object<EnvVars>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  MONGO_DB_NAME: Joi.string().default('passx'),
  JWT_SECRET: Joi.string().min(1).required(),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  METRICS_PORT: Joi.number().integer().min(0).max(65535).default(9464),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().allow('').optional(),
  OTEL_SERVICE_NAME: Joi.string().default('passx-backend'),
  APP_COMMIT: unknown,
  APP_IMAGE_TAG: unknown,
  APP_BUILD_TIME: unknown,
  APP_PIPELINE_URL: unknown,
  POD_NAME: unknown,
  NODE_NAME: unknown,
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
  THROTTLE_AUTH_LIMIT: Joi.number().integer().positive().default(10),
  BREAK_READINESS: Joi.boolean().default(false),
});
