import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, plusvibeRequest, syncNativeEmail, enqueueJobs } = vi.hoisted(
  () => ({
    values: new Map<string, unknown>(),
    plusvibeRequest: vi.fn(),
    syncNativeEmail: vi.fn(),
    enqueueJobs: vi.fn(),
  }),
);
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  enqueueJobs,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({ plusvibeRequest }));
vi.mock('src/logic-functions/utils/native-email', () => ({ syncNativeEmail }));

import {
  getEmailFailureKey,
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import { leadEmailsHandler } from 'src/logic-functions/lead-emails';

const INPUT = {
  workspaceId: 'workspace-1',
  runId: 'run-1',
  leadEmail: 'lead@example.com',
};
const CONTEXT = {
  workspaceId: 'twenty-workspace',
  retryCount: 0,
  maxRetries: 3,
  userWorkspaceId: null,
  workspaceMemberId: null,
};
const EMAIL = {
  id: 'message-1',
  message_id: '<message@example.com>',
  eaccount: 'sender@example.com',
  lead: INPUT.leadEmail,
  sent_on: '2026-11-20T10:00:00Z',
  body: 'Hello',
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  plusvibeRequest.mockReset();
  syncNativeEmail.mockReset();
  values.set(SELECTION_KEY, [INPUT.workspaceId]);
  values.set(getImportKey(INPUT.workspaceId), { runId: INPUT.runId });
  values.set(getRegistrationKey(INPUT.workspaceId), { workspaceName: 'Sales' });
  enqueueJobs.mockResolvedValue({ enqueued: true });
});

describe('Campaign sent-email history', () => {
  it('imports campaign sends and queues the next page with its cursor', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [EMAIL],
      has_more: false,
      page_trail: 'next',
    });
    expect(await leadEmailsHandler(INPUT, CONTEXT)).toEqual({ imported: 1 });
    expect(syncNativeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: EMAIL.message_id,
        direction: 'OUT',
        leadEmail: INPUT.leadEmail,
      }),
    );
    expect(enqueueJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        jobs: [
          expect.objectContaining({ payload: { ...INPUT, pageTrail: 'next' } }),
        ],
      }),
    );
  });

  it('ignores deselected workspaces and superseded import runs', async () => {
    expect(
      await leadEmailsHandler({ ...INPUT, runId: 'old' }, CONTEXT),
    ).toEqual({ skipped: true });
    values.set(SELECTION_KEY, []);
    expect(await leadEmailsHandler(INPUT, CONTEXT)).toEqual({ skipped: true });
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });

  it('uses the worker’s retry protocol for transient failures', async () => {
    plusvibeRequest.mockRejectedValueOnce(new Error('Rate limited'));
    await expect(leadEmailsHandler(INPUT, CONTEXT)).rejects.toMatchObject({
      name: 'RetryableLogicFunctionError',
    });
    expect(values.has(getEmailFailureKey(INPUT.workspaceId))).toBe(false);
  });

  it('records a visible failure after retries are exhausted', async () => {
    plusvibeRequest.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(
      leadEmailsHandler(INPUT, { ...CONTEXT, retryCount: 3 }),
    ).rejects.toThrow('Unavailable');
    expect(values.get(getEmailFailureKey(INPUT.workspaceId))).toMatchObject({
      runId: INPUT.runId,
    });
  });
});
