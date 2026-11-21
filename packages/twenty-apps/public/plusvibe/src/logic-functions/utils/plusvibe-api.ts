import { createHash } from 'node:crypto';
import { isNonEmptyString, isObject } from '@sniptt/guards';
import { z } from 'zod';
import { kv, listConnections } from 'twenty-sdk/logic-function';

import {
  ACCOUNT_CONNECTION_KEY,
  ACCOUNT_PROVIDER_NAME,
  PLUSVIBE_API_URL,
} from 'src/constants/plusvibe';

export const getAccountConnection = async () => {
  const connections = await listConnections({
    providerName: ACCOUNT_PROVIDER_NAME,
    scope: 'WORKSPACE',
  });
  const activeId = await kv.get<string>(ACCOUNT_CONNECTION_KEY);
  const connection = activeId
    ? connections.find((value) => value.id === activeId)
    : connections.length === 1
      ? connections[0]
      : undefined;
  if (connections.length > 0 && !connection)
    throw new Error('Reconnect PlusVibe from its setup page');
  return connection;
};

export const getApiKey = async () => {
  const connection = await getAccountConnection();
  if (connection?.authFailedAt)
    throw new Error('The PlusVibe connection needs to be reconnected');
  if (connection) {
    if (
      connection.providerType !== 'api-key' ||
      !isNonEmptyString(connection.accessToken)
    )
      throw new Error('The PlusVibe connection is missing its API key');
    return connection.accessToken;
  }
  // Existing installs retain their saved key until they reconnect through the native key form.
  const apiKey = process.env.PLUSVIBE_API_KEY?.trim();
  if (!isNonEmptyString(apiKey)) {
    throw new Error('PlusVibe API key is required');
  }
  return apiKey;
};

export const fingerprintApiKey = (apiKey: string) =>
  createHash('sha256').update(apiKey.trim()).digest('hex');

export const getApiKeyFingerprint = async () =>
  fingerprintApiKey(await getApiKey());

export const plusvibeRequest = async <TData>(
  path: string,
  schema: z.ZodType<TData>,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    query?: Record<string, string>;
    apiKey?: string;
  } = {},
): Promise<TData> => {
  const url = new URL(`${PLUSVIBE_API_URL}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'x-api-key': options.apiKey ?? (await getApiKey()),
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    // Provider response bodies can echo credentials or lead data.
    throw new Error(`PlusVibe request failed (${response.status})`);
  }
  const result: unknown = await response.json();
  if (isObject(result) && 'status' in result && result.status === 'error') {
    throw new Error('PlusVibe rejected the request');
  }
  return schema.parse(result);
};

export const WORKSPACES_SCHEMA = z.object({
  workspaces: z.array(z.object({ _id: z.string().min(1), name: z.string() })),
});

export const listWorkspaces = async () =>
  (await plusvibeRequest('/authenticate', WORKSPACES_SCHEMA)).workspaces;
