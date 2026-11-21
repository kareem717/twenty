import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';
import { convert } from 'html-to-text';
import { normalizeMessageId } from 'src/logic-functions/utils/map-email';

const OPTIONAL_TEXT = z.string().nullish();

export const LEAD_SCHEMA = z.looseObject({
  _id: OPTIONAL_TEXT,
  lead_id: OPTIONAL_TEXT,
  workspace_id: OPTIONAL_TEXT,
  campaign_id: OPTIONAL_TEXT,
  camp_id: OPTIONAL_TEXT,
  campaign_name: OPTIONAL_TEXT,
  camp_name: OPTIONAL_TEXT,
  email: OPTIONAL_TEXT,
  lead_email: OPTIONAL_TEXT,
  from_email: OPTIONAL_TEXT,
  first_name: OPTIONAL_TEXT,
  last_name: OPTIONAL_TEXT,
  job_title: OPTIONAL_TEXT,
  status: OPTIONAL_TEXT,
  label: OPTIONAL_TEXT,
});

export type PlusvibeLead = z.infer<typeof LEAD_SCHEMA>;

const EVENT_SCHEMA = LEAD_SCHEMA.extend({
  webhook_event: z.string().min(1),
  webhook_id: OPTIONAL_TEXT,
  workspace_name: OPTIONAL_TEXT,
  sent_email_id: OPTIONAL_TEXT,
  last_email_id: OPTIONAL_TEXT,
  message_id: OPTIONAL_TEXT,
  source_message_id: OPTIONAL_TEXT,
  thread_id: OPTIONAL_TEXT,
  last_thread_id: OPTIONAL_TEXT,
  sent_on: OPTIONAL_TEXT,
  date: OPTIONAL_TEXT,
  modified_at: OPTIONAL_TEXT,
  subject: OPTIONAL_TEXT,
  last_lead_reply_subject: OPTIONAL_TEXT,
  text_body: OPTIONAL_TEXT,
  snippet: OPTIONAL_TEXT,
  body: OPTIONAL_TEXT,
  msg: OPTIONAL_TEXT,
  email_account_name: OPTIONAL_TEXT,
  sender_email: OPTIONAL_TEXT,
  eaccount: OPTIONAL_TEXT,
  to: OPTIONAL_TEXT,
});

const firstText = (...values: (string | null | undefined)[]) =>
  values.find(isNonEmptyString);

export const verifySignature = (
  rawBody: string,
  signature: string | undefined,
  secret: string,
) => {
  if (!isNonEmptyString(signature) || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }
  return timingSafeEqual(
    createHmac('sha256', secret).update(rawBody).digest(),
    Buffer.from(signature, 'hex'),
  );
};

export const normalizeEvent = (body: unknown, workspaceId: string) => {
  const event = EVENT_SCHEMA.parse(body);
  if (
    isNonEmptyString(event.workspace_id) &&
    event.workspace_id !== workspaceId
  ) {
    throw new Error('Webhook workspace does not match its registration');
  }
  const eventType = event.webhook_event;
  const isReply = [
    'FIRST_EMAIL_REPLIES',
    'ALL_EMAIL_REPLIES',
    'ALL_SUBSEQUENCE_REPLIES',
    'ALL_POSITIVE_REPLIES',
  ].includes(eventType);
  if (
    !isReply &&
    !['EMAIL_SENT', 'UNIBOX_EMAIL_SENT', 'BOUNCED_EMAIL'].includes(eventType) &&
    !eventType.startsWith('LEAD_MARKED_AS_')
  ) {
    return null;
  }
  const email = firstText(
    event.email,
    event.lead_email,
    isReply ? event.from_email : undefined,
  )
    ?.trim()
    .toLowerCase();
  if (!email || !z.email().safeParse(email).success) {
    throw new Error('Webhook lead email is missing or invalid');
  }
  const occurredAt = firstText(event.sent_on, event.date, event.modified_at);
  if (!occurredAt || !Number.isFinite(Date.parse(occurredAt))) {
    throw new Error('Webhook event timestamp is missing or invalid');
  }
  const campaignId = firstText(event.campaign_id, event.camp_id);
  const normalizedType = isReply ? 'EMAIL_REPLY' : eventType;
  const messageId = firstText(
    event.sent_email_id,
    event.last_email_id,
    event.source_message_id,
    event.message_id,
  );
  const identity = [
    workspaceId,
    normalizedType,
    email,
    campaignId ?? '',
    eventType.startsWith('LEAD_MARKED_AS_') || eventType === 'BOUNCED_EMAIL'
      ? new Date(occurredAt).toISOString()
      : (messageId ?? new Date(occurredAt).toISOString()),
  ];
  const threadId = firstText(event.thread_id, event.last_thread_id);
  const senderHeader = firstText(
    event.email_account_name,
    event.eaccount,
    event.sender_email,
    isReply ? event.to : event.from_email,
  );
  const sender = senderHeader?.match(/<([^<>]+)>/)?.[1] ?? senderHeader;
  const externalMessageId = firstText(
    event.message_id,
    event.source_message_id,
    event.sent_email_id,
    event.last_email_id,
  );
  const threadLink = new URL('https://app.plusvibe.ai/v2/unibox/inbox/');
  threadLink.searchParams.set('workspace_id', workspaceId);
  if (threadId) threadLink.searchParams.set('mail', threadId);

  return {
    externalId: createHash('sha256')
      .update(JSON.stringify(identity))
      .digest('hex'),
    workspaceId,
    sender: sender?.trim().toLowerCase(),
    direction: isReply ? ('IN' as const) : ('OUT' as const),
    messageId: externalMessageId
      ? normalizeMessageId(externalMessageId)
      : undefined,
    threadId,
    eventType: normalizedType,
    email,
    campaignId,
    campaignName: firstText(event.campaign_name, event.camp_name),
    occurredAt: new Date(occurredAt).toISOString(),
    subject: firstText(event.subject, event.last_lead_reply_subject) ?? '',
    content:
      firstText(
        event.text_body,
        isNonEmptyString(event.body)
          ? convert(event.body, { wordwrap: false })
          : undefined,
        event.snippet,
        event.msg,
      ) ?? '',
    label:
      event.label ??
      (eventType.startsWith('LEAD_MARKED_AS_')
        ? eventType.slice('LEAD_MARKED_AS_'.length)
        : ''),
    threadLink: threadId ? threadLink.toString() : '',
    lead: { ...event, email },
  };
};
