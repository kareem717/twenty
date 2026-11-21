import { isNonEmptyString } from '@sniptt/guards';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { kv } from 'twenty-sdk/logic-function';
import { v5 as uuidV5 } from 'uuid';
import { z } from 'zod';

import { getLeadPersonKey } from 'src/constants/plusvibe';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type PlusvibeLead,
  type normalizeEvent,
} from 'src/logic-functions/utils/normalize-event';

export const recordId = (...parts: string[]) =>
  uuidV5(JSON.stringify(parts), APPLICATION_UNIVERSAL_IDENTIFIER);

const restClient = () => new RestApiClient({ runAs: 'application' });

export const findRecord = async (
  plural: string,
  id: string,
): Promise<boolean> => {
  try {
    await restClient().get(`/rest/${plural}/${id}`);
    return true;
  } catch (error) {
    if (error instanceof RestApiClientError && error.status === 404)
      return false;
    throw error;
  }
};

export const createRecordIfMissing = async (
  plural: string,
  id: string,
  fields: Record<string, unknown>,
) => {
  if (await findRecord(plural, id)) return;
  try {
    await restClient().post(`/rest/${plural}`, { id, ...fields });
  } catch (error) {
    // A concurrent delivery or a lost response may have already committed the same ID.
    if (!(await findRecord(plural, id))) throw error;
  }
};

export const syncPerson = async (
  lead: PlusvibeLead,
  workspaceId: string,
): Promise<string> => {
  const email = (lead.email ?? lead.lead_email)?.trim().toLowerCase();
  if (!isNonEmptyString(email))
    throw new Error('PlusVibe lead email is required');
  const leadId = lead.lead_id ?? lead._id;
  const mappingKey = isNonEmptyString(leadId)
    ? getLeadPersonKey(workspaceId, leadId)
    : undefined;
  if (mappingKey) {
    const mappedId = await kv.get<string>(mappingKey);
    if (isNonEmptyString(mappedId) && (await findRecord('people', mappedId)))
      return mappedId;
  }
  const client = new CoreApiClient({ runAs: 'application' });
  const result: unknown = await client.query({
    people: {
      __args: { filter: { emails: { primaryEmail: { eq: email } } }, first: 1 },
      edges: { node: { id: true } },
    },
  });
  const { people } = z
    .object({
      people: z.object({
        edges: z.array(z.object({ node: z.object({ id: z.uuid() }) })),
      }),
    })
    .parse(result);
  const existing = people.edges[0]?.node;
  if (existing) {
    if (mappingKey) await kv.set(mappingKey, existing.id);
    return existing.id;
  }
  const personId = recordId('person', email);
  await createRecordIfMissing('people', personId, {
    name: { firstName: lead.first_name ?? '', lastName: lead.last_name ?? '' },
    emails: { primaryEmail: email, additionalEmails: [] },
    jobTitle: lead.job_title ?? '',
  });
  if (mappingKey) await kv.set(mappingKey, personId);
  return personId;
};

export const syncCampaign = async ({
  workspaceId,
  workspaceName,
  externalId,
  name,
  status,
}: {
  workspaceId: string;
  workspaceName: string;
  externalId: string;
  name?: string;
  status?: string;
}) => {
  const id = recordId('campaign', workspaceId, externalId);
  const link = new URL('https://app.plusvibe.ai/v2/campaigns/');
  link.searchParams.set('workspace_id', workspaceId);
  const fields = {
    externalId,
    workspaceId,
    workspaceName,
    workspaceRecordId: recordId('workspace', workspaceId),
    campaignLink: {
      primaryLinkLabel: 'PlusVibe',
      primaryLinkUrl: link.toString(),
      secondaryLinks: [],
    },
    ...(isNonEmptyString(name) ? { name } : {}),
    ...(isNonEmptyString(status) ? { status } : {}),
  };
  await createRecordIfMissing('plusvibeCampaigns', id, {
    name: name ?? externalId,
    ...fields,
  });
  await restClient().patch(`/rest/plusvibeCampaigns/${id}`, fields);
  return id;
};

export const syncActivity = async (
  event: NonNullable<ReturnType<typeof normalizeEvent>>,
  workspaceName: string,
) => {
  const id = recordId('activity', event.externalId);
  if (await findRecord('plusvibeActivities', id)) return;
  const personId = await syncPerson(event.lead, event.workspaceId);
  const campaignId = event.campaignId
    ? await syncCampaign({
        workspaceId: event.workspaceId,
        workspaceName,
        externalId: event.campaignId,
        name: event.campaignName,
      })
    : undefined;
  await createRecordIfMissing('plusvibeActivities', id, {
    name: event.subject || event.eventType,
    externalId: event.externalId,
    workspaceId: event.workspaceId,
    workspaceName,
    eventType: event.eventType,
    email: event.email,
    subject: event.subject,
    content: event.content,
    occurredAt: event.occurredAt,
    label: event.label,
    personId,
    ...(campaignId ? { campaignId } : {}),
    threadLink: {
      primaryLinkLabel: 'PlusVibe',
      primaryLinkUrl: event.threadLink,
      secondaryLinks: [],
    },
  });
};
