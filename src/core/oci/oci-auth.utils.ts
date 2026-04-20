import { InternalServerErrorException } from '@nestjs/common';
import * as common from 'oci-common';

export type OciAuthenticationConfig = {
  authMode: string;
  regionId: string;
  tenancyOcid: string;
  userOcid: string;
  fingerprint: string;
  privateKey: string;
};

export function readOciAuthenticationConfig(
  getEnv: (key: string) => string | undefined = (key) => process.env[key],
): OciAuthenticationConfig {
  return {
    authMode: (getEnv('OCI_AUTH_MODE') ?? 'api_key').toLowerCase().trim(),
    regionId: getEnv('OCI_REGION') ?? '',
    tenancyOcid: getEnv('OCI_TENANCY_OCID') ?? '',
    userOcid: getEnv('OCI_USER_OCID') ?? '',
    fingerprint: getEnv('OCI_FINGERPRINT') ?? '',
    privateKey: getEnv('OCI_PRIVATE_KEY')?.replace(/\\n/g, '\n') ?? '',
  };
}

export async function buildOciAuthenticationDetailsProvider(
  config: OciAuthenticationConfig,
  serviceLabel: string,
): Promise<common.AuthenticationDetailsProvider> {
  if (config.authMode === 'instance_principal') {
    return new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
  }

  if (config.authMode === 'resource_principal') {
    return common.ResourcePrincipalAuthenticationDetailsProvider.builder();
  }

  if (config.authMode !== 'api_key') {
    throw new InternalServerErrorException(
      `Unsupported OCI_AUTH_MODE: ${config.authMode}.`,
    );
  }

  ensureRequiredOciApiKeyConfiguration(config, serviceLabel);
  return new common.SimpleAuthenticationDetailsProvider(
    config.tenancyOcid,
    config.userOcid,
    config.fingerprint,
    config.privateKey,
    null,
  );
}

export function ensureRequiredOciApiKeyConfiguration(
  config: OciAuthenticationConfig,
  serviceLabel: string,
): void {
  const missingKeys = [
    ['OCI_REGION', config.regionId],
    ['OCI_TENANCY_OCID', config.tenancyOcid],
    ['OCI_USER_OCID', config.userOcid],
    ['OCI_FINGERPRINT', config.fingerprint],
    ['OCI_PRIVATE_KEY', config.privateKey],
  ]
    .filter((entry) => !entry[1])
    .map((entry) => entry[0]);

  if (missingKeys.length > 0) {
    throw new InternalServerErrorException(
      `Missing ${serviceLabel} configuration: ${missingKeys.join(', ')}`,
    );
  }
}
