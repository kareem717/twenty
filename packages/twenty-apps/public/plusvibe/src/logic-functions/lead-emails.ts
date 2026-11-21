import { createHash } from 'node:crypto';
import { defineLogicFunction } from 'twenty-sdk/define';
import {
  enqueueJobs,
  kv,
  RetryableLogicFunctionError,
  type LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import {
  getEmailFailureKey,
  getImportKey,
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeImportState,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { LEAD_EMAILS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { mapEmail } from 'src/logic-functions/utils/map-email';
import { syncNativeEmail } from 'src/logic-functions/utils/native-email';
import { PAGE_SCHEMA } from 'src/logic-functions/utils/page-schema';
import { plusvibeRequest } from 'src/logic-functions/utils/plusvibe-api';

const INPUT_SCHEMA = z.object({
  workspaceId: z.string(),
  runId: z.string(),
  leadEmail: z.email(),
  pageTrail: z.string().optional(),
});
type LeadEmailInput = z.infer<typeof INPUT_SCHEMA>;

export const enqueueLeadEmails = async (input: LeadEmailInput) => {
  const identity = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  await enqueueJobs({
    logicFunctionUniversalIdentifier: LEAD_EMAILS_UNIVERSAL_IDENTIFIER,
    jobs: [{ jobId: `plusvibe-mail-${identity}`, payload: input }],
    delayMs: 2000,
    retryLimit: 3,
  });
};

export const leadEmailsHandler = async (
  payload: unknown,
  context: LogicFunctionExecutionContext,
) => {
  const input = INPUT_SCHEMA.parse(payload);
  if (
    !((await kv.get<string[]>(SELECTION_KEY)) ?? []).includes(input.workspaceId)
  )
    return { skipped: true };
  const state = await kv.get<PlusvibeImportState>(
    getImportKey(input.workspaceId),
  );
  if (state?.runId !== input.runId) return { skipped: true };
  const registration = await kv.get<PlusvibeRegistration>(
    getRegistrationKey(input.workspaceId),
  );
  if (!registration) return { skipped: true };
  try {
    const query: Record<string, string> = {
      workspace_id: input.workspaceId,
      lead: input.leadEmail,
    };
    if (input.pageTrail) query.page_trail = input.pageTrail;
    const page = await plusvibeRequest('/unibox/campaign-emails', PAGE_SCHEMA, {
      query,
    });
    for (const value of page.data)
      await syncNativeEmail(
        mapEmail(
          value,
          input.workspaceId,
          registration.workspaceName,
          input.leadEmail,
          true,
        ),
      );
    const next = page.page_trail ?? page.next_starting_after;
    if (next && next === input.pageTrail)
      throw new Error('PlusVibe campaign email pagination did not advance');
    if (next) await enqueueLeadEmails({ ...input, pageTrail: next });
    return { imported: page.data.length };
  } catch (error) {
    if (error instanceof z.ZodError || context.retryCount >= context.maxRetries)
      await kv.set(getEmailFailureKey(input.workspaceId), {
        runId: input.runId,
        failedAt: new Date().toISOString(),
      });
    if (
      !(error instanceof z.ZodError) &&
      context.retryCount < context.maxRetries
    )
      throw new RetryableLogicFunctionError(
        error instanceof Error ? error.message : 'PlusVibe email import failed',
      );
    throw error;
  }
};

export default defineLogicFunction({
  universalIdentifier: LEAD_EMAILS_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-lead-emails',
  timeoutSeconds: 300,
  handler: leadEmailsHandler,
});
