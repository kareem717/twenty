import { defineLogicFunction } from 'twenty-sdk/define';

import { CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getConnection, kv } from 'twenty-sdk/logic-function';
import {
  ACCOUNT_CONNECTION_KEY,
  ACCOUNT_PROVIDER_NAME,
  SELECTION_KEY,
} from 'src/constants/plusvibe';
import { z } from 'zod';
import { startImport } from 'src/logic-functions/utils/start-import';

export const connectionOnConnectHandler = async (payload: unknown) => {
  const event = z
    .object({
      connectionProviderName: z.string(),
      connectedAccountId: z.string(),
    })
    .parse(payload);
  if (event.connectionProviderName === ACCOUNT_PROVIDER_NAME) {
    const connection = await getConnection(event.connectedAccountId);
    if (
      connection.providerName !== ACCOUNT_PROVIDER_NAME ||
      connection.scope !== 'WORKSPACE'
    )
      throw new Error('Invalid PlusVibe account connection');
    await kv.set(ACCOUNT_CONNECTION_KEY, connection.id);
  }
  for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? [])
    await startImport(workspaceId, true);
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-connection-on-connect',
  timeoutSeconds: 60,
  handler: connectionOnConnectHandler,
});
