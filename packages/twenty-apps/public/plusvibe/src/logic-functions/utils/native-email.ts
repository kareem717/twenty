import { isNonEmptyString } from '@sniptt/guards';
import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  createMessageChannel,
  ingestMessages,
  kv,
  listConnections,
  listMessageChannels,
  type AppMessageChannel,
} from 'twenty-sdk/logic-function';
import { z } from 'zod';

import { ACCOUNT_PROVIDER_NAME } from 'src/constants/plusvibe';
import {
  API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { getApiKeyFingerprint } from 'src/logic-functions/utils/plusvibe-api';
import {
  recordId,
  syncCampaign,
  syncPerson,
} from 'src/logic-functions/utils/sync-records';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';
import { type PlusvibeLead } from 'src/logic-functions/utils/normalize-event';

export type NativeEmail = {
  externalId: string;
  workspaceId: string;
  workspaceName: string;
  sender: string;
  leadEmail: string;
  leadId?: string;
  lead?: PlusvibeLead;
  campaignId?: string;
  campaignName?: string;
  threadId?: string;
  subject: string;
  text: string;
  receivedAt: string;
  direction: 'IN' | 'OUT';
  label?: string;
};

export const findMailConnection = async () => {
  const fingerprint = await getApiKeyFingerprint();
  return (await listConnections({ scope: 'WORKSPACE' }))
    .sort(
      (first, second) =>
        Number(second.providerName === 'plusvibe-mail') -
        Number(first.providerName === 'plusvibe-mail'),
    )
    .find(
      (connection) =>
        ['plusvibe-mail', ACCOUNT_PROVIDER_NAME].includes(
          connection.providerName,
        ) &&
        connection.externalAccountId === fingerprint &&
        connection.authFailedAt === null,
    );
};

const ensureChannel = async (
  connectedAccountId: string,
  email: NativeEmail,
  messagingProviderUniversalIdentifier: string,
): Promise<AppMessageChannel> => {
  const channelHandle = email.sender.trim().toLowerCase();
  const findExisting = async () =>
    (await listMessageChannels({ connectedAccountId })).find(
      (channel) => channel.handle === channelHandle,
    );
  const existing = await findExisting();
  if (existing) return existing;
  try {
    return await createMessageChannel({
      connectedAccountId,
      handle: channelHandle,
      displayName: email.sender,
      visibility: 'SHARE_EVERYTHING',
      messagingProvider: {
        universalIdentifier: messagingProviderUniversalIdentifier,
      },
    });
  } catch (error) {
    const concurrent = await findExisting();
    if (concurrent) return concurrent;
    throw error;
  }
};

const THREAD_SCHEMA = z.object({
  updatedAt: z.string(),
  plusvibeHasReplies: z.boolean().nullish(),
  plusvibeReplyLabel: z.string().nullish(),
  plusvibeReplyLabels: z.array(z.string()).nullish(),
  plusvibeLatestActivityAt: z.string().nullish(),
});

export const mergeThreadState = (
  current: z.infer<typeof THREAD_SCHEMA>,
  email: Pick<NativeEmail, 'direction' | 'label' | 'receivedAt'>,
) => {
  const labels = new Set(current.plusvibeReplyLabels ?? []);
  const label = email.label?.trim().toUpperCase();
  if (isNonEmptyString(label))
    labels.add(
      [
        'INTERESTED',
        'NOT_INTERESTED',
        'UNSUBSCRIBED',
        'OUT_OF_OFFICE',
      ].includes(label)
        ? label
        : 'OTHER',
    );
  const isLatest =
    Date.parse(email.receivedAt) >=
    Date.parse(current.plusvibeLatestActivityAt ?? '1970-01-01');
  return {
    plusvibeHasReplies:
      current.plusvibeHasReplies === true || email.direction === 'IN',
    plusvibeReplyLabels: [...labels],
    plusvibeReplyLabel:
      isLatest && isNonEmptyString(label)
        ? label
        : (current.plusvibeReplyLabel ?? ''),
    plusvibeLatestActivityAt: isLatest
      ? email.receivedAt
      : current.plusvibeLatestActivityAt,
  };
};

export const getCanonicalThreadId = async (email: NativeEmail) => {
  const logicalId = recordId(
    'conversation',
    email.workspaceId,
    email.sender,
    email.leadEmail,
    email.campaignId ?? '',
  );
  const key = `plusvibe:conversation:${logicalId}`;
  const current = await kv.get<{
    canonicalId: string;
    providerThreadId?: string;
  }>(key);
  if (
    current &&
    (!current.providerThreadId ||
      !email.threadId ||
      current.providerThreadId === email.threadId)
  ) {
    if (email.threadId && !current.providerThreadId)
      await kv.set(key, { ...current, providerThreadId: email.threadId });
    return current.canonicalId;
  }
  if (current && email.threadId) return email.threadId;
  const canonicalId = email.threadId ?? logicalId;
  await kv.set(key, { canonicalId, providerThreadId: email.threadId });
  return canonicalId;
};

export const updateThreadMetadata = async (
  threadId: string,
  fields: Record<string, unknown>,
  email: Pick<NativeEmail, 'direction' | 'label' | 'receivedAt'>,
) => {
  const client = new RestApiClient({ runAs: 'application' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.get<{ data: { messageThread: unknown } }>(
      `/rest/messageThreads/${threadId}`,
    );
    const current = THREAD_SCHEMA.parse(response.data.messageThread);
    const result = await client.post<{
      data?: { updateMessageThreads: { id: string }[] };
      errors?: unknown[];
    }>('/graphql', {
      query:
        'mutation($id:UUID!,$updatedAt:DateTime!,$data:MessageThreadUpdateInput!){updateMessageThreads(filter:{id:{eq:$id},updatedAt:{eq:$updatedAt}},data:$data){id}}',
      variables: {
        id: threadId,
        updatedAt: current.updatedAt,
        data: { ...fields, ...mergeThreadState(current, email) },
      },
    });
    if (result.errors?.length)
      throw new Error('Could not update PlusVibe thread metadata');
    if (result.data?.updateMessageThreads.length) return;
  }
  throw new Error(
    'PlusVibe thread metadata changed concurrently; retry the delivery',
  );
};

export const updateThreadLabel = async (
  workspaceId: string,
  threadId: string,
  label: string,
  occurredAt: string,
) => {
  const response = await new RestApiClient({ runAs: 'application' }).post<{
    data?: { messageThreads: { edges: { node: { id: string } }[] } };
    errors?: unknown[];
  }>('/graphql', {
    query:
      'query($workspace:String!,$thread:String!){messageThreads(filter:{plusvibeWorkspaceId:{eq:$workspace},plusvibeThreadId:{eq:$thread}}){edges{node{id}}}}',
    variables: { workspace: workspaceId, thread: threadId },
  });
  if (response.errors?.length)
    throw new Error('Could not find the PlusVibe thread');
  for (const { node } of response.data?.messageThreads.edges ?? [])
    await updateThreadMetadata(
      node.id,
      {},
      { direction: 'OUT', label, receivedAt: occurredAt },
    );
};

export const syncNativeEmail = async (email: NativeEmail) => {
  z.email().parse(email.sender);
  z.email().parse(email.leadEmail);
  if (!Number.isFinite(Date.parse(email.receivedAt)))
    throw new Error('Invalid PlusVibe email timestamp');
  const connection = await findMailConnection();
  if (!connection)
    throw new Error(
      'Connect PlusVibe emails in the app Connections tab before importing messages',
    );
  const channel = await ensureChannel(
    connection.id,
    email,
    connection.providerName === ACCOUNT_PROVIDER_NAME
      ? API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER
      : MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  );
  const personId = await syncPerson(
    {
      ...email.lead,
      email: email.leadEmail,
      lead_id: email.leadId ?? email.lead?.lead_id,
    },
    email.workspaceId,
  );
  const workspaceId = await syncWorkspace(
    { _id: email.workspaceId, name: email.workspaceName },
    true,
  );
  const campaignId = email.campaignId
    ? await syncCampaign({
        workspaceId: email.workspaceId,
        workspaceName: email.workspaceName,
        externalId: email.campaignId,
        name: email.campaignName,
      })
    : undefined;
  const nativeThreadExternalId = await getCanonicalThreadId(email);
  const [message] = await ingestMessages({
    messageChannelId: channel.id,
    messages: [
      {
        externalId: `${email.workspaceId}:${email.externalId}`,
        threadExternalId: `${email.workspaceId}:${nativeThreadExternalId}`,
        subject: email.subject,
        text: email.text,
        receivedAt: new Date(email.receivedAt),
        participants: [
          {
            role: email.direction === 'OUT' ? 'FROM' : 'TO',
            handle: channel.handle,
            displayName: email.sender,
          },
          {
            role: email.direction === 'OUT' ? 'TO' : 'FROM',
            handle: email.leadEmail,
            displayName: email.leadEmail,
            personId,
          },
        ],
      },
    ],
  });
  if (!message)
    throw new Error('Twenty did not acknowledge the imported message');
  const client = new RestApiClient({ runAs: 'application' });
  const common = {
    source: 'PLUSVIBE',
    plusvibeWorkspaceId: email.workspaceId,
    plusvibeSender: email.sender,
    plusvibeWorkspaceRecordId: workspaceId,
    ...(email.campaignId ? { plusvibeCampaignId: email.campaignId } : {}),
    ...(campaignId ? { plusvibeCampaignRecordId: campaignId } : {}),
    ...(email.threadId ? { plusvibeThreadId: email.threadId } : {}),
  };
  await client.patch(`/rest/messages/${message.messageId}`, {
    ...common,
    plusvibeExternalId: email.externalId,
  });
  await updateThreadMetadata(
    message.messageThreadId,
    { ...common, plusvibePersonId: personId },
    email,
  );
  return message;
};
