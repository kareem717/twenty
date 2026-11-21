import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { values, listConnections, getConnection, startImport, fetchRequest } =
  vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    listConnections: vi.fn(),
    getConnection: vi.fn(),
    startImport: vi.fn(),
    fetchRequest: vi.fn(),
  }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  listConnections,
  getConnection,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/start-import', () => ({ startImport }));

import { ACCOUNT_CONNECTION_KEY, SELECTION_KEY } from 'src/constants/plusvibe';
import { identifyAccountHandler } from 'src/logic-functions/identify-account';
import { connectionOnConnectHandler } from 'src/logic-functions/connection-on-connect';
import { findMailConnection } from 'src/logic-functions/utils/native-email';
import {
  fingerprintApiKey,
  getApiKey,
  getApiKeyFingerprint,
} from 'src/logic-functions/utils/plusvibe-api';

const ACCOUNT = {
  id: 'native-account',
  providerName: 'plusvibe',
  providerType: 'api-key',
  scope: 'WORKSPACE',
  accessToken: 'native-key',
  authFailedAt: null,
  externalAccountId: fingerprintApiKey('native-key'),
};

beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  vi.stubEnv('PLUSVIBE_API_KEY', 'legacy-key');
  vi.stubGlobal('fetch', fetchRequest);
  listConnections.mockResolvedValue([]);
  getConnection.mockResolvedValue(ACCOUNT);
  fetchRequest.mockResolvedValue({
    ok: true,
    json: async () => ({ workspaces: [] }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('One PlusVibe account connection', () => {
  it('reads the native credential instead of the legacy app variable', async () => {
    listConnections.mockResolvedValue([ACCOUNT]);
    expect(await getApiKey()).toBe('native-key');
    expect(await getApiKeyFingerprint()).toBe(ACCOUNT.externalAccountId);
  });

  it('keeps existing installs working without asking for their key again', async () => {
    expect(await getApiKey()).toBe('legacy-key');
  });

  it('uses the explicitly connected account when multiple connections exist', async () => {
    listConnections.mockResolvedValue([
      { ...ACCOUNT, id: 'other-account', accessToken: 'other-key' },
      ACCOUNT,
    ]);
    values.set(ACCOUNT_CONNECTION_KEY, ACCOUNT.id);
    expect(await getApiKey()).toBe('native-key');
  });

  it('does not silently choose between multiple unconfigured accounts', async () => {
    listConnections.mockResolvedValue([
      ACCOUNT,
      { ...ACCOUNT, id: 'other-account' },
    ]);
    await expect(getApiKey()).rejects.toThrow('Reconnect PlusVibe');
  });

  it('does not fall back to an old key if the native credential is revoked or missing', async () => {
    listConnections.mockResolvedValueOnce([
      { ...ACCOUNT, authFailedAt: '2026-11-20T00:00:00Z' },
    ]);
    await expect(getApiKey()).rejects.toThrow('reconnected');
    listConnections.mockResolvedValueOnce([{ ...ACCOUNT, accessToken: '' }]);
    await expect(getApiKey()).rejects.toThrow('missing its API key');
  });

  it('validates the submitted key without saving a second copy or changing sync selection', async () => {
    const result = await identifyAccountHandler({
      accessToken: ' submitted-key ',
    });
    expect(result).toEqual({
      externalAccountId: fingerprintApiKey('submitted-key'),
      handle: 'PlusVibe',
    });
    expect(fetchRequest).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'submitted-key' }),
      }),
    );
    expect(values.size).toBe(0);
  });

  it('does not accept an invalid key', async () => {
    fetchRequest.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      identifyAccountHandler({ accessToken: 'invalid-key' }),
    ).rejects.toThrow('401');
    expect(values.size).toBe(0);
  });

  it('requires stopping sync before switching the source account', async () => {
    values.set(SELECTION_KEY, ['workspace-1']);
    await expect(
      identifyAccountHandler({ accessToken: 'different-key' }),
    ).rejects.toThrow('Stop syncing');
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('connecting never selects workspaces or starts an import on its own', async () => {
    await connectionOnConnectHandler({
      connectionProviderName: 'plusvibe',
      connectedAccountId: ACCOUNT.id,
    });
    expect(values.get(ACCOUNT_CONNECTION_KEY)).toBe(ACCOUNT.id);
    expect(values.has(SELECTION_KEY)).toBe(false);
    expect(startImport).not.toHaveBeenCalled();
  });

  it('keeps legacy message channels when the same key is moved to the native connection', async () => {
    const legacy = {
      ...ACCOUNT,
      id: 'legacy-mail',
      providerName: 'plusvibe-mail',
      providerType: 'custom',
      accessToken: null,
    };
    listConnections.mockImplementation(
      async (filter: { providerName?: string }) =>
        filter.providerName ? [ACCOUNT] : [ACCOUNT, legacy],
    );
    expect((await findMailConnection())?.id).toBe('legacy-mail');
  });
});
