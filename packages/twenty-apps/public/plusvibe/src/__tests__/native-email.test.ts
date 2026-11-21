import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  values,
  ingestMessages,
  createMessageChannel,
  listMessageChannels,
  listConnections,
  get,
  post,
  patch,
  syncPerson,
  syncCampaign,
  syncWorkspace,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  ingestMessages: vi.fn(),
  createMessageChannel: vi.fn(),
  listMessageChannels: vi.fn(),
  listConnections: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  syncPerson: vi.fn(),
  syncCampaign: vi.fn(),
  syncWorkspace: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', () => ({
  ingestMessages,
  createMessageChannel,
  listMessageChannels,
  listConnections,
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    get = get;
    post = post;
    patch = patch;
  },
}));
vi.mock('src/logic-functions/utils/sync-records', () => ({
  syncPerson,
  syncCampaign,
  recordId: (...parts: string[]) => parts.join(':'),
}));
vi.mock('src/logic-functions/utils/sync-workspace', () => ({ syncWorkspace }));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({
  getApiKeyFingerprint: () => 'fingerprint',
}));

import {
  getCanonicalThreadId,
  mergeThreadState,
  syncNativeEmail,
  type NativeEmail,
} from 'src/logic-functions/utils/native-email';

const EMAIL: NativeEmail = {
  externalId: '<message@example.com>',
  workspaceId: 'workspace-1',
  workspaceName: 'Sales',
  sender: 'sender@example.com',
  leadEmail: 'lead@example.com',
  campaignId: 'campaign-1',
  threadId: 'provider-thread-1',
  subject: 'Hello',
  text: 'How can we help?',
  receivedAt: '2026-11-20T10:00:00Z',
  direction: 'OUT',
};
const CURRENT_THREAD = {
  updatedAt: '2026-11-20T11:00:00Z',
  plusvibeHasReplies: false,
  plusvibeReplyLabels: [],
  plusvibeLatestActivityAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  listConnections.mockReset().mockResolvedValue([
    {
      id: 'connection-1',
      providerName: 'plusvibe-mail',
      externalAccountId: 'fingerprint',
      authFailedAt: null,
    },
  ]);
  listMessageChannels.mockReset().mockResolvedValue([]);
  createMessageChannel.mockReset().mockResolvedValue({
    id: 'channel-1',
    handle: 'sender@example.com',
  });
  ingestMessages.mockReset().mockResolvedValue([
    {
      externalId: EMAIL.externalId,
      messageId: 'native-message-1',
      messageThreadId: 'native-thread-1',
    },
  ]);
  syncPerson.mockResolvedValue('person-1');
  syncCampaign.mockResolvedValue('campaign-record-1');
  syncWorkspace.mockResolvedValue('workspace-record-1');
  get
    .mockReset()
    .mockResolvedValue({ data: { messageThread: CURRENT_THREAD } });
  post.mockReset().mockResolvedValue({
    data: { updateMessageThreads: [{ id: 'native-thread-1' }] },
  });
});

describe('Native PlusVibe emails', () => {
  it('retains the source lead identity when a reply uses an alternate address', async () => {
    await syncNativeEmail({
      ...EMAIL,
      leadEmail: 'alternate@example.com',
      leadId: 'source-lead-1',
      direction: 'IN',
    });
    expect(syncPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alternate@example.com',
        lead_id: 'source-lead-1',
      }),
      EMAIL.workspaceId,
    );
  });
  it('ingests real Messages with the lead participant linked to a Person', async () => {
    await syncNativeEmail(EMAIL);
    expect(ingestMessages).toHaveBeenCalledWith({
      messageChannelId: 'channel-1',
      messages: [
        expect.objectContaining({
          externalId: `workspace-1:${EMAIL.externalId}`,
          threadExternalId: 'workspace-1:provider-thread-1',
          text: EMAIL.text,
          participants: [
            expect.objectContaining({
              role: 'FROM',
              handle: 'sender@example.com',
            }),
            expect.objectContaining({ role: 'TO', personId: 'person-1' }),
          ],
        }),
      ],
    });
    expect(patch).toHaveBeenCalledWith(
      '/rest/messages/native-message-1',
      expect.objectContaining({
        source: 'PLUSVIBE',
        plusvibeWorkspaceId: 'workspace-1',
        plusvibeWorkspaceRecordId: 'workspace-record-1',
        plusvibeCampaignId: 'campaign-1',
        plusvibeCampaignRecordId: 'campaign-record-1',
        plusvibeThreadId: 'provider-thread-1',
      }),
    );
  });

  it('ingests replies as incoming and sets the native thread reply filter', async () => {
    await syncNativeEmail({ ...EMAIL, direction: 'IN', label: 'INTERESTED' });
    expect(ingestMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            participants: [
              expect.objectContaining({ role: 'TO' }),
              expect.objectContaining({ role: 'FROM', personId: 'person-1' }),
            ],
          }),
        ],
      }),
    );
    expect(post).toHaveBeenCalledWith(
      '/graphql',
      expect.objectContaining({
        variables: expect.objectContaining({
          data: expect.objectContaining({
            plusvibeHasReplies: true,
            plusvibeReplyLabels: ['INTERESTED'],
            plusvibeReplyLabel: 'INTERESTED',
          }),
        }),
      }),
    );
  });

  it('keeps message identities isolated when a sender is shared by two source workspaces', async () => {
    await syncNativeEmail(EMAIL);
    await syncNativeEmail({ ...EMAIL, workspaceId: 'workspace-2' });
    expect(ingestMessages.mock.calls[0][0].messages[0].externalId).not.toBe(
      ingestMessages.mock.calls[1][0].messages[0].externalId,
    );
    expect(
      ingestMessages.mock.calls[0][0].messages[0].threadExternalId,
    ).not.toBe(ingestMessages.mock.calls[1][0].messages[0].threadExternalId);
  });

  it('reuses existing channels and never creates messages without an approved connection', async () => {
    listMessageChannels.mockResolvedValueOnce([
      {
        id: 'existing-channel',
        handle: 'sender@example.com',
      },
    ]);
    await syncNativeEmail(EMAIL);
    expect(createMessageChannel).not.toHaveBeenCalled();
    listConnections.mockResolvedValueOnce([]);
    await expect(syncNativeEmail(EMAIL)).rejects.toThrow('Connect PlusVibe');
    expect(ingestMessages).toHaveBeenCalledOnce();
  });

  it('adopts a later PlusVibe thread ID without splitting the initial conversation', async () => {
    const first = await getCanonicalThreadId({ ...EMAIL, threadId: undefined });
    expect(await getCanonicalThreadId(EMAIL)).toBe(first);
    expect(
      await getCanonicalThreadId({
        ...EMAIL,
        threadId: 'another-provider-thread',
      }),
    ).toBe('another-provider-thread');
  });

  it('preserves interested/not interested history and reply state after later sends', () => {
    const state = {
      ...CURRENT_THREAD,
      plusvibeHasReplies: true,
      plusvibeReplyLabels: ['INTERESTED'],
      plusvibeReplyLabel: 'INTERESTED',
      plusvibeLatestActivityAt: '2026-11-20T10:00:00Z',
    };
    expect(
      mergeThreadState(state, {
        direction: 'OUT',
        label: 'NOT_INTERESTED',
        receivedAt: '2026-11-20T11:00:00Z',
      }),
    ).toMatchObject({
      plusvibeHasReplies: true,
      plusvibeReplyLabels: ['INTERESTED', 'NOT_INTERESTED'],
      plusvibeReplyLabel: 'NOT_INTERESTED',
    });
    expect(
      mergeThreadState(state, {
        direction: 'IN',
        label: 'NOT_INTERESTED',
        receivedAt: '2026-11-19T11:00:00Z',
      }).plusvibeReplyLabel,
    ).toBe('INTERESTED');
  });

  it('retries metadata updates after a concurrent thread change', async () => {
    post.mockResolvedValueOnce({ data: { updateMessageThreads: [] } });
    await syncNativeEmail(EMAIL);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('propagates ingestion failures instead of producing activity copies', async () => {
    ingestMessages.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(syncNativeEmail(EMAIL)).rejects.toThrow(
      'Database unavailable',
    );
    expect(patch).not.toHaveBeenCalled();
  });
});
