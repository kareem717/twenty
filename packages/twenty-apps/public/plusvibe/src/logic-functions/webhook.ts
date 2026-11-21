import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { kv, RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import {
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { WEBHOOK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  normalizeEvent,
  verifySignature,
} from 'src/logic-functions/utils/normalize-event';
import { getApiKeyFingerprint } from 'src/logic-functions/utils/plusvibe-api';
import { syncActivity } from 'src/logic-functions/utils/sync-records';
import {
  syncNativeEmail,
  updateThreadLabel,
} from 'src/logic-functions/utils/native-email';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';

export const webhookHandler = async (event: RoutePayload<unknown>) => {
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const registrations = await Promise.all(
    selected.map((workspaceId) =>
      kv.get<PlusvibeRegistration>(getRegistrationKey(workspaceId)),
    ),
  );
  const registration = registrations.find(
    (candidate) =>
      candidate?.registrationId === event.queryStringParameters.registrationId,
  );
  if (!registration) return { skipped: true };
  if (registration.apiKeyFingerprint !== (await getApiKeyFingerprint()))
    return { skipped: true };
  const rawBody =
    event.isBase64Encoded && event.rawBody
      ? Buffer.from(event.rawBody, 'base64').toString('utf8')
      : event.rawBody;
  if (
    !rawBody ||
    !verifySignature(rawBody, event.headers.signature, registration.secret)
  ) {
    throw new Error('Invalid PlusVibe webhook signature');
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid PlusVibe webhook JSON');
  }
  const normalized = normalizeEvent(body, registration.workspaceId);
  if (!normalized) return { skipped: true };
  try {
    if (
      ['EMAIL_SENT', 'UNIBOX_EMAIL_SENT', 'EMAIL_REPLY'].includes(
        normalized.eventType,
      )
    ) {
      if (!normalized.sender || !normalized.messageId)
        throw new Error(
          'PlusVibe webhook is missing sender or message identity',
        );
      await syncNativeEmail({
        externalId: normalized.messageId,
        workspaceId: normalized.workspaceId,
        workspaceName: registration.workspaceName,
        sender: normalized.sender,
        leadEmail: normalized.email,
        leadId: normalized.lead.lead_id ?? undefined,
        lead: normalized.lead,
        direction: normalized.direction,
        campaignId: normalized.campaignId,
        campaignName: normalized.campaignName,
        threadId: normalized.threadId,
        receivedAt: normalized.occurredAt,
        subject: normalized.subject,
        text: normalized.content,
        label: normalized.label,
      });
    } else {
      await syncWorkspace(
        { _id: registration.workspaceId, name: registration.workspaceName },
        true,
      );
      await syncActivity(normalized, registration.workspaceName);
      if (normalized.threadId && normalized.label)
        await updateThreadLabel(
          normalized.workspaceId,
          normalized.threadId,
          normalized.label,
          normalized.occurredAt,
        );
    }
  } catch (error) {
    throw new RetryableLogicFunctionError(
      error instanceof Error ? error.message : 'PlusVibe message sync failed',
    );
  }
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-webhook',
  description:
    'Verifies signed deliveries, ingests native emails, and updates thread reply classifications.',
  timeoutSeconds: 60,
  handler: webhookHandler,
});
