import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, plusvibeRequest } = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  plusvibeRequest: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
    delete: vi.fn(async (key: string) => values.delete(key)),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest,
  getApiKeyFingerprint: () => 'fingerprint',
}));

import {
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { registerWorkspace } from 'src/logic-functions/utils/register-workspace';

const WORKSPACE = { _id: '65099a0dd96fae8ab61130c0', name: 'Test workspace' };

beforeEach(() => {
  vi.clearAllMocks();
  plusvibeRequest.mockReset();
  values.clear();
  vi.stubEnv('TWENTY_API_URL', 'https://crm.example.com');
  vi.stubEnv(
    'TWENTY_SERVER_ROUTES_URL',
    'https://functions.example.com/webhooks/server',
  );
});

describe('PlusVibe webhook registration', () => {
  it('registers all email events and the workspace’s actual lead labels', async () => {
    plusvibeRequest
      .mockResolvedValueOnce({ hooks: [] })
      .mockResolvedValueOnce([{ key: 'INTERESTED' }, { key: 'HOT_LEAD' }])
      .mockResolvedValueOnce({ _id: 'hook-1' });
    await registerWorkspace(WORKSPACE);
    const registration = values.get(
      getRegistrationKey(WORKSPACE._id),
    ) as PlusvibeRegistration;
    expect(registration.webhookId).toBe('hook-1');
    expect(registration.secret).toHaveLength(64);
    expect(registration.url).toMatch(
      /^https:\/\/functions.example.com\/webhooks\/server\//,
    );
    expect(plusvibeRequest).toHaveBeenLastCalledWith(
      '/hook/add',
      expect.anything(),
      {
        method: 'POST',
        body: expect.objectContaining({
          workspace_id: WORKSPACE._id,
          secret: registration.secret,
          camp_ids: ['ALL'],
          event_types: expect.arrayContaining([
            'ALL_EMAIL_REPLIES',
            'EMAIL_SENT',
            'BOUNCED_EMAIL',
            'LEAD_MARKED_AS_HOT_LEAD',
          ]),
        }),
      },
    );
  });

  it('reconciles a timed-out creation by destination before another write', async () => {
    plusvibeRequest
      .mockResolvedValueOnce({ hooks: [] })
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Timed out'));
    await expect(registerWorkspace(WORKSPACE)).rejects.toThrow('Timed out');
    const pending = values.get(
      getRegistrationKey(WORKSPACE._id),
    ) as PlusvibeRegistration;
    expect(pending.webhookId).toBeUndefined();
    plusvibeRequest.mockResolvedValueOnce({
      hooks: [{ _id: 'committed-hook', url: pending.url, status: 'ACTIVE' }],
    });
    await registerWorkspace(WORKSPACE);
    expect(
      plusvibeRequest.mock.calls.filter(([path]) => path === '/hook/add'),
    ).toHaveLength(1);
    expect(values.get(getRegistrationKey(WORKSPACE._id))).toMatchObject({
      webhookId: 'committed-hook',
      secret: pending.secret,
    });
  });

  it('does not replace an inactive webhook with a duplicate', async () => {
    values.set(getRegistrationKey(WORKSPACE._id), {
      registrationId: 'registration-1',
      url: 'https://example.com/hook',
      secret: 'secret',
      apiKeyFingerprint: 'fingerprint',
    });
    plusvibeRequest.mockResolvedValueOnce({
      hooks: [
        { _id: 'hook-1', url: 'https://example.com/hook', status: 'INACTIVE' },
      ],
    });
    await expect(registerWorkspace(WORKSPACE)).rejects.toThrow('inactive');
    expect(plusvibeRequest).toHaveBeenCalledOnce();
  });

  it('blocks replacing the key of a workspace that is still selected', async () => {
    values.set(SELECTION_KEY, [WORKSPACE._id]);
    values.set(getRegistrationKey(WORKSPACE._id), {
      apiKeyFingerprint: 'old-fingerprint',
    });
    await expect(registerWorkspace(WORKSPACE)).rejects.toThrow('Disconnect');
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });

  it('requires HTTPS before creating any provider webhook', async () => {
    vi.stubEnv(
      'TWENTY_SERVER_ROUTES_URL',
      'http://localhost:3000/webhooks/server',
    );
    await expect(registerWorkspace(WORKSPACE)).rejects.toThrow('HTTPS');
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });
});
