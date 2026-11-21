import { beforeEach, describe, expect, it, vi } from 'vitest';

const { values, plusvibeRequest, syncPerson, syncCampaign, enqueueImportPage } =
  vi.hoisted(() => ({
    values: new Map<string, unknown>(),
    plusvibeRequest: vi.fn(),
    syncPerson: vi.fn(),
    syncCampaign: vi.fn(),
    enqueueImportPage: vi.fn(),
  }));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  plusvibeRequest,
  getApiKeyFingerprint: () => 'fingerprint',
}));
vi.mock('src/logic-functions/utils/start-import', () => ({
  enqueueImportPage,
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson,
  syncCampaign,
}));

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection: async () => undefined,
  syncNativeEmail: vi.fn(),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));
vi.mock('src/logic-functions/lead-emails', () => ({
  enqueueLeadEmails: vi.fn(),
}));

import { backfillHandler } from 'src/logic-functions/backfill';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const PAYLOAD = {
  workspaceId: WORKSPACE_ID,
  runId: 'run-1',
  phase: 'leads',
  cursor: null,
};
const CONTEXT = {
  workspaceId: 'twenty-workspace',
  userWorkspaceId: null,
  workspaceMemberId: null,
  retryCount: 0,
  maxRetries: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  values.set(SELECTION_KEY, [WORKSPACE_ID]);
  values.set(getRegistrationKey(WORKSPACE_ID), {
    workspaceName: 'Test',
    apiKeyFingerprint: 'fingerprint',
  });
  values.set(getImportKey(WORKSPACE_ID), {
    runId: 'run-1',
    phase: 'leads',
    processed: 0,
  });
});

describe('PlusVibe paginated import', () => {
  it('imports a page and checkpoints its cursor', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com', workspace_id: WORKSPACE_ID }],
      has_more: true,
      next_starting_after: 'next',
    });
    await backfillHandler(PAYLOAD, CONTEXT);
    expect(syncPerson).toHaveBeenCalledOnce();
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      cursor: 'next',
      processed: 1,
    });
    expect(enqueueImportPage).toHaveBeenCalledOnce();
  });

  it('moves from campaigns to leads and email history', async () => {
    values.set(getImportKey(WORKSPACE_ID), {
      runId: 'run-1',
      phase: 'campaigns',
      processed: 0,
    });
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ id: 'campaign-1', camp_name: 'Outreach', status: 'ACTIVE' }],
      has_more: false,
    });
    await backfillHandler({ ...PAYLOAD, phase: 'campaigns' }, CONTEXT);
    expect(syncCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Outreach' }),
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'leads',
    });
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: false });
    await backfillHandler(PAYLOAD, CONTEXT);
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'emails',
    });
  });

  it('stops imports for deselected workspaces or superseded runs', async () => {
    expect(
      await backfillHandler({ ...PAYLOAD, runId: 'old-run' }, CONTEXT),
    ).toEqual({ skipped: true });
    values.set(SELECTION_KEY, []);
    expect(await backfillHandler(PAYLOAD, CONTEXT)).toEqual({ skipped: true });
    expect(plusvibeRequest).not.toHaveBeenCalled();
  });

  it('does not advance the cursor when a CRM write fails', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com' }],
      has_more: true,
      next_starting_after: 'next',
    });
    syncPerson.mockRejectedValueOnce(new Error('Database failed'));
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'Database failed',
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).not.toHaveProperty('cursor');
  });

  it('recovers a failed next-page enqueue without processing an obsolete page', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [],
      has_more: true,
      next_starting_after: 'next',
    });
    enqueueImportPage.mockRejectedValueOnce(new Error('Queue unavailable'));
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'Queue unavailable',
    );
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      cursor: 'next',
    });
    expect(await backfillHandler(PAYLOAD, CONTEXT)).toEqual({ skipped: true });
    expect(plusvibeRequest).toHaveBeenCalledOnce();
    expect(enqueueImportPage).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      expect.objectContaining({ cursor: 'next' }),
    );
  });

  it('rejects foreign lead records and a stuck pagination cursor', async () => {
    plusvibeRequest.mockResolvedValueOnce({
      data: [{ email: 'lead@example.com', workspace_id: 'foreign' }],
      has_more: false,
    });
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow('foreign');
    plusvibeRequest.mockResolvedValueOnce({ data: [], has_more: true });
    await expect(backfillHandler(PAYLOAD, CONTEXT)).rejects.toThrow(
      'pagination',
    );
  });

  it('shows a failed import after retries are exhausted', async () => {
    plusvibeRequest.mockRejectedValueOnce(new Error('Rate limited'));
    await expect(
      backfillHandler(PAYLOAD, { ...CONTEXT, retryCount: 3 }),
    ).rejects.toThrow('Rate limited');
    expect(values.get(getImportKey(WORKSPACE_ID))).toMatchObject({
      phase: 'failed',
    });
  });
});
