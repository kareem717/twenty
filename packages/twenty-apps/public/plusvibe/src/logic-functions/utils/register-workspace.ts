import { randomBytes, randomUUID } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';
import { getServerRouteUrl } from 'twenty-sdk/utils';
import { z } from 'zod';

import {
  getClaimKey,
  getRegistrationKey,
  SELECTION_KEY,
  WEBHOOK_EVENT_TYPES,
  type PlusvibeRegistration,
  type PlusvibeWorkspace,
} from 'src/constants/plusvibe';
import { WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getApiKeyFingerprint,
  plusvibeRequest,
} from 'src/logic-functions/utils/plusvibe-api';

const HOOKS_SCHEMA = z.object({
  hooks: z.array(
    z.object({
      _id: z.string().min(1),
      url: z.string(),
      status: z.string(),
    }),
  ),
});

const getWebhookUrl = (registrationId: string) => {
  const url = new URL(getServerRouteUrl(WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER));
  if (url.protocol !== 'https:') {
    throw new Error('PlusVibe webhooks require a public HTTPS Twenty URL');
  }
  url.search = '';
  url.hash = '';
  url.searchParams.set('registrationId', registrationId);
  return url.toString();
};

export const registerWorkspace = async (workspace: PlusvibeWorkspace) => {
  const key = getRegistrationKey(workspace._id);
  let registration = await kv.get<PlusvibeRegistration>(key);
  const apiKeyFingerprint = await getApiKeyFingerprint();

  if (registration && registration.apiKeyFingerprint !== apiKeyFingerprint) {
    const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
    if (selected.includes(workspace._id)) {
      throw new Error(
        'Disconnect selected workspaces before replacing the PlusVibe API key',
      );
    }
    await kv.delete(getClaimKey(registration.registrationId), {
      scope: 'SERVER',
    });
    registration = null;
  }

  if (!registration) {
    const registrationId = randomUUID();
    registration = {
      registrationId,
      secret: randomBytes(32).toString('hex'),
      url: getWebhookUrl(registrationId),
      workspaceId: workspace._id,
      workspaceName: workspace.name,
      apiKeyFingerprint,
    };
    // Save the destination before POST so an uncertain creation can be reconciled by URL.
    await kv.set(key, registration);
  }

  await kv.set(getClaimKey(registration.registrationId), null, {
    scope: 'SERVER',
  });

  const { hooks } = await plusvibeRequest('/hook/list', HOOKS_SCHEMA, {
    query: { workspace_id: workspace._id },
  });
  const existing = hooks.find((hook) => hook.url === registration.url);
  if (existing && existing.status !== 'ACTIVE') {
    throw new Error(
      'The PlusVibe webhook is inactive. Enable it in PlusVibe and retry',
    );
  }
  const labels = existing
    ? []
    : await plusvibeRequest(
        '/workspace-settings/lead-labels',
        z.array(z.object({ key: z.string().min(1) })),
        {
          query: { workspace_id: workspace._id },
        },
      );
  const eventTypes = [
    ...WEBHOOK_EVENT_TYPES,
    ...labels.map((label) => `LEAD_MARKED_AS_${label.key.toUpperCase()}`),
  ];
  const webhookId =
    existing?._id ??
    (
      await plusvibeRequest(
        '/hook/add',
        z.object({
          _id: z.string().min(1),
        }),
        {
          method: 'POST',
          body: {
            workspace_id: workspace._id,
            name: 'Twenty CRM',
            url: registration.url,
            secret: registration.secret,
            camp_ids: ['ALL'],
            event_types: eventTypes,
            ignore_ooo: 0,
            ignore_automatic: 0,
          },
        },
      )
    )._id;

  await kv.set(key, {
    ...registration,
    workspaceName: workspace.name,
    webhookId,
  });
};
