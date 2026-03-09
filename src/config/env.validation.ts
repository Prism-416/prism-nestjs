import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('NestJS Template API'),
  APP_DESCRIPTION: Joi.string().default('Reusable NestJS backend template'),
  APP_VERSION: Joi.string().default('1.0.0'),
  CORS_ORIGIN: Joi.string().allow('').default(''),
  DB_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  PG_HOST: Joi.when('DB_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().default('127.0.0.1'),
  }),
  PG_PORT: Joi.when('DB_ENABLED', {
    is: true,
    then: Joi.number().port().required(),
    otherwise: Joi.number().port().default(5432),
  }),
  PG_USER: Joi.when('DB_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().default('postgres'),
  }),
  PG_PASSWORD: Joi.when('DB_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default('postgres'),
  }),
  PG_DB: Joi.when('DB_ENABLED', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().default('nestjs_template'),
  }),
  PG_SCHEMA: Joi.string().allow('').default(''),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
});
