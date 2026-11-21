import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';
import { z } from 'zod';

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  fingerprintApiKey,
  getApiKeyFingerprint,
  plusvibeRequest,
  WORKSPACES_SCHEMA,
} from 'src/logic-functions/utils/plusvibe-api';

export const identifyAccountHandler = async (payload: unknown) => {
  const { accessToken } = z
    .object({ accessToken: z.string().trim().min(1) })
    .parse(payload);
  const fingerprint = fingerprintApiKey(accessToken);
  const selected = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  if (selected.length > 0 && fingerprint !== (await getApiKeyFingerprint()))
    throw new Error(
      'Stop syncing before connecting a different PlusVibe account',
    );
  await plusvibeRequest('/authenticate', WORKSPACES_SCHEMA, {
    apiKey: accessToken,
  });
  return { externalAccountId: fingerprint, handle: 'PlusVibe' };
};

export default defineLogicFunction({
  universalIdentifier: IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-identify-account',
  timeoutSeconds: 30,
  handler: identifyAccountHandler,
});
