import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  normalizeEvent,
  verifySignature,
} from 'src/logic-functions/utils/normalize-event';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const BASE_EVENT = {
  webhook_event: 'ALL_EMAIL_REPLIES',
  workspace_id: WORKSPACE_ID,
  from_email: 'Lead@Example.com',
  campaign_id: 'campaign-1',
  last_email_id: 'message-1',
  thread_id: 'thread-1',
  modified_at: '2026-11-20T10:00:00Z',
  text_body: 'Tell me more',
};

describe('PlusVibe webhook normalization', () => {
  it('verifies the published PlusVibe HMAC test vector', () => {
    expect(
      verifySignature(
        '{"webhook_event":"SYSTEM_ALERT","alert":"EMAIL_ACCOUNT_DISCONNECTED"}',
        'a927cde9781124cf8e28e8e5886e4dff6bf7c792877211fd2a3d6e9d0cc95097',
        'my_webhook_secret',
      ),
    ).toBe(true);
  });

  it('rejects missing, malformed, and tampered signatures', () => {
    const body = JSON.stringify(BASE_EVENT);
    const signature = createHmac('sha256', 'secret').update(body).digest('hex');
    expect(verifySignature(body, signature, 'secret')).toBe(true);
    expect(verifySignature(`${body} `, signature, 'secret')).toBe(false);
    expect(verifySignature(body, undefined, 'secret')).toBe(false);
    expect(verifySignature(body, 'invalid', 'secret')).toBe(false);
  });

  it('normalizes reply email and links to the correct workspace and thread', () => {
    expect(normalizeEvent(BASE_EVENT, WORKSPACE_ID)).toMatchObject({
      email: 'lead@example.com',
      eventType: 'EMAIL_REPLY',
      content: 'Tell me more',
      threadLink: `https://app.plusvibe.ai/v2/unibox/inbox/?workspace_id=${WORKSPACE_ID}&mail=thread-1`,
    });
  });

  it('deduplicates overlapping reply subscriptions without collapsing later replies', () => {
    const first = normalizeEvent(BASE_EVENT, WORKSPACE_ID);
    expect(
      normalizeEvent(
        {
          ...BASE_EVENT,
          webhook_id: 'another-hook',
          webhook_event: 'FIRST_EMAIL_REPLIES',
        },
        WORKSPACE_ID,
      )?.externalId,
    ).toBe(first?.externalId);
    expect(
      normalizeEvent(
        { ...BASE_EVENT, last_email_id: 'message-2' },
        WORKSPACE_ID,
      )?.externalId,
    ).not.toBe(first?.externalId);
  });

  it('uses the registered workspace for bounce payloads that omit workspace_id', () => {
    expect(
      normalizeEvent(
        {
          webhook_event: 'BOUNCED_EMAIL',
          lead_email: 'lead@example.com',
          date: BASE_EVENT.modified_at,
          msg: 'Mailbox not found',
        },
        WORKSPACE_ID,
      ),
    ).toMatchObject({
      workspaceId: WORKSPACE_ID,
      content: 'Mailbox not found',
    });
  });

  it('does not mistake the Unibox sender for the lead', () => {
    expect(
      normalizeEvent(
        {
          ...BASE_EVENT,
          webhook_event: 'UNIBOX_EMAIL_SENT',
          email: 'lead@example.com',
          from_email: 'sender@example.com',
        },
        WORKSPACE_ID,
      )?.email,
    ).toBe('lead@example.com');
    expect(() =>
      normalizeEvent(
        { ...BASE_EVENT, webhook_event: 'UNIBOX_EMAIL_SENT' },
        WORKSPACE_ID,
      ),
    ).toThrow('lead email');
  });

  it('does not collapse two label changes for the same message', () => {
    const event = {
      ...BASE_EVENT,
      email: 'lead@example.com',
      webhook_event: 'LEAD_MARKED_AS_UNSUBSCRIBED',
    };
    expect(normalizeEvent(event, WORKSPACE_ID)?.label).toBe('UNSUBSCRIBED');
    expect(
      normalizeEvent(
        { ...event, modified_at: '2026-11-20T11:00:00Z' },
        WORKSPACE_ID,
      )?.externalId,
    ).not.toBe(normalizeEvent(event, WORKSPACE_ID)?.externalId);
  });

  it('rejects foreign workspaces, invalid email, and invalid timestamps', () => {
    expect(() => normalizeEvent(BASE_EVENT, 'foreign')).toThrow('workspace');
    expect(() =>
      normalizeEvent({ ...BASE_EVENT, from_email: 'bad' }, WORKSPACE_ID),
    ).toThrow('email');
    expect(() =>
      normalizeEvent({ ...BASE_EVENT, modified_at: 'bad' }, WORKSPACE_ID),
    ).toThrow('timestamp');
  });

  it('ignores unsupported event types', () => {
    expect(
      normalizeEvent({ webhook_event: 'SYSTEM_ALERT' }, WORKSPACE_ID),
    ).toBeNull();
  });
});
