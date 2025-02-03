import crypto from 'crypto';
import * as jose from 'jose';
import saml from '@boxyhq/saml20';
import { JacksonError } from './error';

export enum IndexNames {
  EntityID = 'entityID',
  TenantProduct = 'tenantProduct',
  OIDCProviderClientID = 'OIDCProviderClientID',
  SSOClientID = 'SSOClientID',
  Product = 'product',
  Tenant = 'tenant',
  TenantProvider = 'tenantProvider',
  TenantUser = 'tenantUser',
  LLMConversation = 'llmConversation',

  // For Setup link
  Service = 'service',
  SetupToken = 'token',
  ProductService = 'productService',
  TenantProductService = 'tenantProductService',
}

// The namespace prefix for the database store
export const storeNamespacePrefix = {
  dsync: {
    config: 'dsync:config',
    logs: 'dsync:logs',
    users: 'dsync:users',
    groups: 'dsync:groups',
    members: 'dsync:members',
    providers: 'dsync:providers',
    events: 'dsync:events',
    lock: 'dsync:lock',
  },
  saml: {
    config: 'saml:config',
  },
};

export const relayStatePrefix = 'boxyhq_jackson_';
export const clientIDFederatedPrefix = 'fed_';
export const clientIDOIDCPrefix = 'oidc_';

export const validateAbsoluteUrl = (url, message) => {
  try {
    new URL(url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    throw new JacksonError(message ? message : 'Invalid url', 400);
  }
};

// https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
export function getErrorMessage(error: unknown) {
  if (error instanceof saml.WrapError) {
    return error.message + ' ' + error.inner.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const createRandomSecret = async (length: number) => {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export async function loadJWSPrivateKey(
  key: string,
  alg: string
): Promise<jose.KeyLike> {
  const pkcs8 = Buffer.from(key, 'base64').toString('ascii');
  const privateKey = await jose.importPKCS8(pkcs8, alg);
  return privateKey;
}

export function isJWSKeyPairLoaded(jwsKeyPair: {
  private: string;
  public: string;
}) {
  if (!jwsKeyPair.private || !jwsKeyPair.public) {
    return false;
  }
  return true;
}

export const importJWTPublicKey = async (
  key: string,
  jwsAlg: string
): Promise<jose.KeyLike> => {
  const spki = Buffer.from(key, 'base64').toString('ascii');
  const publicKey = await jose.importSPKI(spki, jwsAlg);
  return publicKey;
};

export const exportPublicKeyJWK = async (
  key: jose.KeyLike
): Promise<jose.JWK> => {
  const publicJWK = await jose.exportJWK(key);
  return publicJWK;
};

export const generateJwkThumbprint = async (jwk: jose.JWK): Promise<string> => {
  const thumbprint = await jose.calculateJwkThumbprint(jwk);
  return thumbprint;
};

export const computeKid = async (
  key: string,
  jwsAlg: string
): Promise<string> => {
  const importedPublicKey = await importJWTPublicKey(key, jwsAlg!);
  const publicKeyJWK = await exportPublicKeyJWK(importedPublicKey);
  return await generateJwkThumbprint(publicKeyJWK);
};

export const validateRedirectUrl = ({
  redirectUrlList,
  defaultRedirectUrl,
}) => {
  if (redirectUrlList) {
    if (redirectUrlList.length > 100) {
      throw new JacksonError(
        'Exceeded maximum number of allowed redirect urls',
        400
      );
    }
    for (const url of redirectUrlList) {
      validateAbsoluteUrl(url, 'redirectUrl is invalid');
    }
  }
  if (defaultRedirectUrl) {
    validateAbsoluteUrl(defaultRedirectUrl, 'defaultRedirectUrl is invalid');
  }
};

export const extractRedirectUrls = (urls: string[] | string): string[] => {
  if (!urls) {
    return [];
  }

  if (typeof urls === 'string') {
    if (urls.startsWith('[')) {
      // redirectUrl is a stringified array
      return JSON.parse(urls);
    }
    // redirectUrl is a single URL
    return [urls];
  }

  // redirectUrl is an array of URLs
  return urls;
};

export const extractHostName = (url: string): string | null => {
  try {
    const pUrl = new URL(url);

    if (pUrl.hostname.startsWith('www.')) {
      return pUrl.hostname.substring(4);
    }

    return pUrl.hostname;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return null;
  }
};

export const getScopeValues = (scope?: string): string[] => {
  return typeof scope === 'string'
    ? scope.split(' ').filter((s) => s.length > 0)
    : [];
};

export const getEncodedTenantProduct = (
  param: string
): { tenant: string | null; product: string | null } | null => {
  try {
    const sp = new URLSearchParams(param);
    const tenant = sp.get('tenant');
    const product = sp.get('product');
    if (tenant && product) {
      return {
        tenant: sp.get('tenant'),
        product: sp.get('product'),
      };
    }

    return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return null;
  }
};

export const validateTenantAndProduct = (tenant: string, product: string) => {
  if (tenant.indexOf(':') !== -1) {
    throw new JacksonError('tenant cannot contain the character :', 400);
  }

  if (product.indexOf(':') !== -1) {
    throw new JacksonError('product cannot contain the character :', 400);
  }
};

// List of well known providers
const wellKnownProviders = {
  'okta.com': 'Okta',
  'sts.windows.net': 'Entra ID',
  'mocksaml.com': 'MockSAML',
  'onelogin.com': 'OneLogin',
  'keycloak.com': 'Keycloak',
  'jumpcloud.com': 'JumpCloud',
  'google.com': 'Google',
  'auth0.com': 'Auth0',
  'pingone.com': 'PingOne',
} as const;

// Find the friendly name of the provider from the entityID
export const findFriendlyProviderName = (
  providerName: string
): keyof typeof wellKnownProviders | 'null' => {
  const provider = Object.keys(wellKnownProviders).find((provider) =>
    providerName.includes(provider)
  );

  return provider ? wellKnownProviders[provider] : null;
};

export const isLocalhost = (url: string) => {
  let givenURL: URL;
  try {
    givenURL = new URL(url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }
  return givenURL.hostname === 'localhost' || givenURL.hostname === '127.0.0.1';
};

export const validateSortOrder = (sortOrder: unknown) => {
  if (sortOrder === null || sortOrder === '') {
    return;
  }

  const _sortOrder = parseInt(sortOrder as string);

  if (isNaN(_sortOrder)) {
    throw new JacksonError('The field `sortOrder` must be a number.', 400);
  }

  if (_sortOrder < 0) {
    throw new JacksonError(
      'The field `sortOrder` must be a number greater than or equal to 0.',
      400
    );
  }
};
