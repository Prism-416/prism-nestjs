import Joi from 'joi';

type EnvValidationValues = Record<string, unknown>;

function hasConfiguredValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return typeof value === 'number' || typeof value === 'boolean';
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'local')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('NestJS Template API'),
  APP_DESCRIPTION: Joi.string().default('Reusable NestJS backend template'),
  APP_VERSION: Joi.string().default('1.0.0'),
  JWT_SECRET: Joi.string().min(16).default('dev-only-change-me'),
  JWT_REFRESH_SECRET: Joi.string().allow('').default(''),
  JWT_ACCESS_EXPIRES_IN_SEC: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_EXPIRES_IN_SEC: Joi.number().integer().min(300).default(1209600),
  WORKSPACE_INVITATION_EXPIRES_IN_SEC: Joi.number()
    .integer()
    .min(300)
    .default(86400),
  WORKSPACE_INVITATION_PAGE_URL: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_OAUTH_STATE_SECRET: Joi.string().allow('').default(''),
  GITHUB_OAUTH_STATE_TTL_SEC: Joi.number().integer().min(60).default(600),
  EMAIL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  EMAIL_SENDER_EMAIL: Joi.string().allow('').default(''),
  EMAIL_SENDER_NAME: Joi.string().allow('').default(''),
  EMAIL_VERIFICATION_PAGE_URL: Joi.string().allow('').default(''),
  OCI_AUTH_MODE: Joi.string()
    .valid('api_key', 'instance_principal', 'resource_principal')
    .default('api_key'),
  OCI_COMPARTMENT_ID: Joi.string().allow('').default(''),
  OCI_REGION: Joi.string().allow('').default(''),
  OCI_TENANCY_OCID: Joi.string().allow('').default(''),
  OCI_USER_OCID: Joi.string().allow('').default(''),
  OCI_FINGERPRINT: Joi.string().allow('').default(''),
  OCI_PRIVATE_KEY: Joi.string().allow('').default(''),
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
})
  .custom((env, helpers) => {
    const values = env as EnvValidationValues;

    if (values.EMAIL_ENABLED !== true) {
      return values;
    }

    const missingKeys = ['EMAIL_SENDER_EMAIL', 'OCI_COMPARTMENT_ID'].filter(
      (key) => !hasConfiguredValue(values[key]),
    );

    if (values.OCI_AUTH_MODE === 'api_key') {
      missingKeys.push(
        ...[
          'OCI_REGION',
          'OCI_TENANCY_OCID',
          'OCI_USER_OCID',
          'OCI_FINGERPRINT',
          'OCI_PRIVATE_KEY',
        ].filter((key) => !hasConfiguredValue(values[key])),
      );
    }

    if (missingKeys.length > 0) {
      return helpers.error('any.custom', {
        message: `Missing required email configuration: ${missingKeys.join(', ')}`,
      });
    }

    return values;
  }, 'OCI email validation')
  .messages({
    'any.custom': '{{#message}}',
  });
