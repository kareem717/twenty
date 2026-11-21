import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestApiClientError } from 'twenty-client-sdk/rest';

const { records, query, post, patch, mappings } = vi.hoisted(() => ({
  records: new Set<string>(),
  query: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  mappings: new Map<string, unknown>(),
}));
vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient: class {
    query = query;
  },
}));
vi.mock('twenty-client-sdk/rest', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('twenty-client-sdk/rest')>();
  return {
    ...original,
    RestApiClient: class {
      get = vi.fn(async (path: string) => {
        if (!records.has(path))
          throw new original.RestApiClientError('Missing', { status: 404 });
        return {};
      });
      post = post;
      patch = patch;
    },
  };
});
vi.mock('twenty-sdk/logic-function', () => ({
  kv: {
    get: vi.fn(async (key: string) => mappings.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      mappings.set(key, value);
    }),
  },
}));

import { getLeadPersonKey } from 'src/constants/plusvibe';
import { normalizeEvent } from 'src/logic-functions/utils/normalize-event';
import {
  createRecordIfMissing,
  recordId,
  syncActivity,
  syncPerson,
} from 'src/logic-functions/utils/sync-records';

beforeEach(() => {
  vi.clearAllMocks();
  query.mockReset();
  post.mockReset();
  patch.mockReset();
  records.clear();
  mappings.clear();
  query.mockResolvedValue({ people: { edges: [] } });
  post.mockImplementation(async (path: string, fields: { id: string }) => {
    records.add(`${path}/${fields.id}`);
  });
});

describe('Twenty record synchronization', () => {
  it('matches an existing person by normalized email without overwriting their data', async () => {
    const personId = recordId('existing');
    query.mockResolvedValueOnce({
      people: { edges: [{ node: { id: personId } }] },
    });
    expect(
      await syncPerson(
        { email: 'LEAD@example.com', first_name: 'Other' },
        'workspace-1',
      ),
    ).toBe(personId);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        people: expect.objectContaining({
          __args: expect.objectContaining({
            filter: { emails: { primaryEmail: { eq: 'lead@example.com' } } },
          }),
        }),
      }),
    );
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('creates the same person only once across PlusVibe workspaces', async () => {
    await syncPerson({ email: 'lead@example.com' }, 'workspace-1');
    await syncPerson({ email: 'lead@example.com' }, 'workspace-2');
    expect(post).toHaveBeenCalledOnce();
  });

  it('reuses a mapped lead when they reply from another address', async () => {
    const personId = recordId('existing');
    mappings.set(getLeadPersonKey('workspace-1', 'lead-1'), personId);
    records.add(`/rest/people/${personId}`);
    expect(
      await syncPerson(
        { email: 'alternate@example.com', lead_id: 'lead-1' },
        'workspace-1',
      ),
    ).toBe(personId);
    expect(query).not.toHaveBeenCalled();
  });

  it('does not duplicate activity on redelivery or merge different workspaces', async () => {
    const event = normalizeEvent(
      {
        webhook_event: 'EMAIL_SENT',
        email: 'lead@example.com',
        sent_on: '2026-11-20T10:00:00Z',
        sent_email_id: 'message-1',
      },
      'workspace-1',
    );
    if (!event) throw new Error('Expected an event');
    await syncActivity(event, 'Workspace 1');
    await syncActivity(event, 'Workspace 1');
    expect(
      post.mock.calls.filter(([path]) => path === '/rest/plusvibeActivities'),
    ).toHaveLength(1);
    expect(recordId('campaign', 'workspace-1', 'campaign-1')).not.toBe(
      recordId('campaign', 'workspace-2', 'campaign-1'),
    );
  });

  it('recovers a committed write after a lost response', async () => {
    post.mockImplementationOnce(
      async (path: string, fields: { id: string }) => {
        records.add(`${path}/${fields.id}`);
        throw new Error('Connection lost');
      },
    );
    await expect(
      createRecordIfMissing('people', recordId('person'), { name: 'Test' }),
    ).resolves.toBeUndefined();
  });

  it('propagates database failures when the record was not committed', async () => {
    post.mockRejectedValueOnce(
      new RestApiClientError('Database unavailable', { status: 503 }),
    );
    await expect(
      createRecordIfMissing('people', recordId('person'), {}),
    ).rejects.toThrow('Database unavailable');
  });
});
