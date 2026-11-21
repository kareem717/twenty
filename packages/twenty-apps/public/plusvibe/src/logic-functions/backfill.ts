import { defineLogicFunction } from 'twenty-sdk/define';
import {
  kv,
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import {
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { LEAD_SCHEMA } from 'src/logic-functions/utils/normalize-event';
import {
  getApiKeyFingerprint,
  plusvibeRequest,
} from 'src/logic-functions/utils/plusvibe-api';
import { enqueueImportPage } from 'src/logic-functions/utils/start-import';
import {
  syncCampaign,
  syncPerson,
} from 'src/logic-functions/utils/sync-records';

import { CURSOR_PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';
import {
  findMailConnection,
  syncNativeEmail,
} from 'src/logic-functions/utils/native-email';
import { mapEmail } from 'src/logic-functions/utils/map-email';
import { enqueueLeadEmails } from 'src/logic-functions/lead-emails';

const CAMPAIGN_SCHEMA = z.union([
  z.object({
    id: z.string().min(1),
    camp_name: z.string(),
    status: z.string(),
  }),
  z
    .object({
      _id: z.string().min(1),
      camp_name: z.string(),
      status: z.string(),
    })
    .transform(({ _id, ...campaign }) => ({ ...campaign, id: _id })),
]);

export const backfillHandler = async (
  payload: unknown,
  context: LogicFunctionExecutionContext,
) => {
  const { workspaceId, runId, phase, cursor } = z
    .object({
      workspaceId: z.string(),
      runId: z.string(),
      phase: z.enum(['campaigns', 'leads', 'emails', 'archivedEmails']),
      cursor: z.string().nullable(),
    })
    .parse(payload);
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  if (!selected.includes(workspaceId)) return { skipped: true };
  const key = getImportKey(workspaceId);
  const state = await kv.get<PlusvibeImportState>(key);
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(workspaceId),
  );
  if (
    !state ||
    state.runId !== runId ||
    ['complete', 'awaitingConnection'].includes(state.phase) ||
    !registration
  )
    return { skipped: true };
  if (registration.apiKeyFingerprint !== (await getApiKeyFingerprint()))
    return { skipped: true };
  if (state.phase === 'failed') return { skipped: true };
  if (state.phase !== phase || (state.cursor ?? null) !== cursor) {
    await enqueueImportPage(workspaceId, state);
    return { skipped: true };
  }

  try {
    await syncWorkspace(
      { _id: workspaceId, name: registration.workspaceName },
      true,
    );
    const connection = await findMailConnection();
    if (['emails', 'archivedEmails'].includes(state.phase) && !connection) {
      await kv.set(key, {
        ...state,
        phase: 'awaitingConnection',
        updatedAt: new Date().toISOString(),
      });
      return { waitingForConnection: true };
    }
    const query: Record<string, string> = {
      workspace_id: workspaceId,
      limit: '10',
    };
    if (state.cursor) query.starting_after = state.cursor;
    if (state.phase === 'emails' || state.phase === 'archivedEmails') {
      query.email_type = 'all';
      query.preview_only = 'false';
    }
    if (state.phase === 'archivedEmails') query.is_archived = '1';
    const page = await plusvibeRequest(
      state.phase === 'campaigns'
        ? '/campaign/list-all'
        : state.phase === 'leads'
          ? '/lead/workspace-leads'
          : '/unibox/emails',
      CURSOR_PAGE_SCHEMA,
      { query },
    );
    for (const data of page.data) {
      if (state.phase === 'campaigns') {
        const campaign = CAMPAIGN_SCHEMA.parse(data);
        await syncCampaign({
          workspaceId,
          workspaceName: registration.workspaceName,
          externalId: campaign.id,
          name: campaign.camp_name,
          status: campaign.status,
        });
      } else if (state.phase === 'leads') {
        const lead = LEAD_SCHEMA.parse(data);
        if (lead.workspace_id && lead.workspace_id !== workspaceId)
          throw new Error('PlusVibe returned a foreign workspace lead');
        if (!z.email().safeParse(lead.email).success) continue;
        await syncPerson(lead, workspaceId);
        if (connection && lead.email)
          await enqueueLeadEmails({
            workspaceId,
            runId,
            leadEmail: lead.email,
          });
      } else {
        await syncNativeEmail(
          mapEmail(data, workspaceId, registration.workspaceName),
        );
      }
    }
    if (
      page.has_more &&
      (!page.next_starting_after || page.next_starting_after === state.cursor)
    ) {
      throw new Error('PlusVibe pagination did not advance');
    }
    const next: PlusvibeImportState = {
      ...state,
      phase: page.has_more
        ? state.phase
        : state.phase === 'campaigns'
          ? 'leads'
          : state.phase === 'leads'
            ? 'emails'
            : state.phase === 'emails'
              ? 'archivedEmails'
              : 'complete',
      cursor: page.has_more
        ? (page.next_starting_after ?? undefined)
        : undefined,
      processed: state.processed + page.data.length,
      updatedAt: new Date().toISOString(),
    };
    const current = await kv.get<PlusvibeImportState>(key);
    if (current?.runId !== runId) return { skipped: true };
    await kv.set(key, next);
    if (next.phase !== 'complete') await enqueueImportPage(workspaceId, next);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError || context.retryCount >= context.maxRetries)
      await kv.set(key, {
        ...state,
        phase: 'failed',
        updatedAt: new Date().toISOString(),
      });
    if (
      !(error instanceof z.ZodError) &&
      context.retryCount < context.maxRetries
    )
      throw new RetryableLogicFunctionError(
        error instanceof Error ? error.message : 'PlusVibe import failed',
      );
    throw error;
  }
};

export default defineLogicFunction({
  universalIdentifier: BACKFILL_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-backfill',
  timeoutSeconds: 300,
  handler: backfillHandler,
});
