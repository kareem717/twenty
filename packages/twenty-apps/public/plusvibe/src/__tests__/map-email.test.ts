import { describe, expect, it } from 'vitest';

import { mapEmail } from 'src/logic-functions/utils/map-email';
import {
  CURSOR_PAGE_SCHEMA,
  PAGE_SCHEMA,
} from 'src/logic-functions/utils/page-schema';

const CAMPAIGN_EMAIL = {
  id: 'provider-message',
  message_id: '&lt;rfc-message@example.com&gt;',
  workspace_id: 'workspace-1',
  campaign_id: 'campaign-1',
  eaccount: 'sender@example.com',
  lead: 'lead@example.com',
  sent_on: '2026-11-20T10:00:00Z',
  subject: 'Hello',
  body: '<p>Hello <b>there</b></p>',
};

describe('PlusVibe email API formats', () => {
  it('accepts legacy campaign arrays without dropping records', () => {
    expect(PAGE_SCHEMA.parse([{ id: 'campaign-1' }])).toMatchObject({
      data: [{ id: 'campaign-1' }],
      has_more: false,
    });
  });

  it('follows legacy array pages until empty without assuming the first page is complete', () => {
    expect(
      CURSOR_PAGE_SCHEMA.parse([{ _id: 'lead-1' }, { _id: 'lead-2' }]),
    ).toMatchObject({ has_more: true, next_starting_after: 'lead-2' });
    expect(CURSOR_PAGE_SCHEMA.parse([{ id: 'campaign-1' }])).toMatchObject({
      has_more: true,
      next_starting_after: 'campaign-1',
    });
    expect(CURSOR_PAGE_SCHEMA.parse([])).toMatchObject({ has_more: false });
    expect(
      CURSOR_PAGE_SCHEMA.parse({
        data: [{ id: 'campaign-1' }],
        has_more: false,
      }),
    ).toMatchObject({ has_more: false });
    expect(() =>
      CURSOR_PAGE_SCHEMA.parse([{ email: 'lead@example.com' }]),
    ).toThrow();
  });

  it('maps campaign sent emails to stable native identities and plain text', () => {
    expect(
      mapEmail(CAMPAIGN_EMAIL, 'workspace-1', 'Sales', undefined, true),
    ).toMatchObject({
      externalId: '<rfc-message@example.com>',
      direction: 'OUT',
      sender: 'sender@example.com',
      leadEmail: 'lead@example.com',
      text: 'Hello there',
    });
  });

  it('imports full Unibox reply bodies and the original thread identity', () => {
    expect(
      mapEmail(
        {
          ...CAMPAIGN_EMAIL,
          type: 'received',
          timestamp_created: CAMPAIGN_EMAIL.sent_on,
          thread_id: 'thread-1',
          label: 'INTERESTED',
          body: { text: 'Tell me more', html: '<p>Tell me more</p>' },
        },
        'workspace-1',
        'Sales',
      ),
    ).toMatchObject({
      threadId: 'thread-1',
      direction: 'IN',
      label: 'INTERESTED',
      text: 'Tell me more',
    });
  });

  it('does not mistake Unibox sends for incoming mail when From is omitted', () => {
    expect(
      mapEmail({ ...CAMPAIGN_EMAIL, type: 'sent' }, 'workspace-1', 'Sales')
        .direction,
    ).toBe('OUT');
  });

  it('rejects cross-workspace messages and incomplete identities', () => {
    expect(() => mapEmail(CAMPAIGN_EMAIL, 'foreign', 'Sales')).toThrow(
      'Foreign',
    );
    expect(() => mapEmail({ id: 'message-1' }, 'workspace-1', 'Sales')).toThrow(
      'missing',
    );
  });
});
