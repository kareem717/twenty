import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import { kv, Response } from 'twenty-sdk/logic-function';
import { z } from 'zod';

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';

const inspectPagination = async (path: string, workspaceId: string) => {
  const query = { workspace_id: workspaceId, limit: '10' };
  const first = await plusvibeRequest(path, CURSOR_PAGE_SCHEMA, { query });
  const next =
    first.has_more && first.next_starting_after
      ? await plusvibeRequest(path, CURSOR_PAGE_SCHEMA, {
          query: { ...query, starting_after: first.next_starting_after },
        })
      : undefined;
  const identity = (value: unknown) => {
    const row = z
      .object({ id: z.string().optional(), _id: z.string().optional() })
      .parse(value);
    return row.id ?? row._id;
  };
  const firstIds = new Set(first.data.map(identity));
  return {
    isLegacyArray: first.isLegacyArray,
    count: first.data.length,
    hasMore: first.has_more,
    nextPageCount: next?.data.length,
    overlapCount: next?.data.filter((value) => firstIds.has(identity(value)))
      .length,
  };
};

export const syncHealthHandler = async (payload: unknown) => {
  if (!(await canManageApplication()))
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  const { workspaceId } = z.object({ workspaceId: z.string() }).parse(payload);
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  if (!selected.includes(workspaceId))
    return new Response(
      { error: 'Workspace is not selected' },
      { status: 400 },
    );
  const campaigns = await inspectPagination('/campaign/list-all', workspaceId);
  const leads = await inspectPagination('/lead/workspace-leads', workspaceId);
  const native = await new RestApiClient({ runAs: 'application' }).post(
    '/graphql',
    {
      query:
        '{messages(filter:{source:{eq:PLUSVIBE}}){totalCount} messageThreads(filter:{source:{eq:PLUSVIBE}}){totalCount}}',
    },
  );
  return {
    campaigns,
    leads,
    native,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'b41f3ce6-7670-46b2-8957-1a559ea0af3a',
  name: 'plusvibe-sync-health',
  timeoutSeconds: 60,
  handler: syncHealthHandler,
});
