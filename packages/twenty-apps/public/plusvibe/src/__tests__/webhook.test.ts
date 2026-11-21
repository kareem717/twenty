import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';

const { values, syncActivity, syncNativeEmail } = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  syncActivity: vi.fn(),
  syncNativeEmail: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  listConnections: vi.fn(async () => []),
  kv: { get: vi.fn(async (key: string) => values.get(key) ?? null) },
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({ syncActivity }));

vi.mock('src/logic-functions/utils/native-email', () => ({
  syncNativeEmail,
  updateThreadLabel: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));

import { getRegistrationKey, SELECTION_KEY } from 'src/constants/plusvibe';
import { webhookHandler } from 'src/logic-functions/webhook';
import { getApiKeyFingerprint } from 'src/logic-functions/utils/plusvibe-api';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const body = JSON.stringify({
  webhook_event: 'EMAIL_SENT',
  workspace_id: WORKSPACE_ID,
  email: 'lead@example.com',
  sent_email_id: 'message-1',
  email_account_name: 'sender@example.com',
  sent_on: '2026-11-20T10:00:00Z',
});
const event = (): RoutePayload<unknown> => ({
  headers: {
    signature: createHmac('sha256', 'secret').update(body).digest('hex'),
  },
  queryStringParameters: { registrationId: 'registration-1' },
  pathParameters: {},
  body: null,
  rawBody: body,
  isBase64Encoded: false,
  requestContext: { http: { method: 'POST', path: '/' } },
  userWorkspaceId: null,
});

beforeEach(async () => {
  vi.clearAllMocks();
  values.clear();
  vi.stubEnv('PLUSVIBE_API_KEY', 'test-key');
  values.set(SELECTION_KEY, [WORKSPACE_ID]);
  values.set(getRegistrationKey(WORKSPACE_ID), {
    registrationId: 'registration-1',
    secret: 'secret',
    workspaceId: WORKSPACE_ID,
    workspaceName: 'Test workspace',
    apiKeyFingerprint: await getApiKeyFingerprint(),
  });
});

describe('PlusVibe webhook processing', () => {
  it('parses only the signed raw body and ingests a native email', async () => {
    await webhookHandler({
      ...event(),
      body: { email: 'tampered@example.com' },
    });
    expect(syncNativeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        leadEmail: 'lead@example.com',
        sender: 'sender@example.com',
        workspaceName: 'Test workspace',
      }),
    );
    expect(syncActivity).not.toHaveBeenCalled();
  });

  it('ignores deselected workspaces', async () => {
    values.set(SELECTION_KEY, []);
    expect(await webhookHandler(event())).toEqual({ skipped: true });
    expect(syncActivity).not.toHaveBeenCalled();
  });

  it('ignores deliveries from unknown registrations and replaced keys', async () => {
    expect(
      await webhookHandler({
        ...event(),
        queryStringParameters: { registrationId: 'unknown' },
      }),
    ).toEqual({ skipped: true });
    vi.stubEnv('PLUSVIBE_API_KEY', 'replacement');
    expect(await webhookHandler(event())).toEqual({ skipped: true });
    expect(syncActivity).not.toHaveBeenCalled();
  });

  it('rejects forged deliveries before writing any records', async () => {
    await expect(
      webhookHandler({ ...event(), headers: { signature: '0'.repeat(64) } }),
    ).rejects.toThrow('signature');
    expect(syncActivity).not.toHaveBeenCalled();
  });

  it('retries record failures instead of reporting success', async () => {
    syncNativeEmail.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(webhookHandler(event())).rejects.toThrow(
      'Database unavailable',
    );
  });
});
