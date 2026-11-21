import { defineLogicFunction } from 'twenty-sdk/define';

import { CONNECTION_CALLBACK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  getApiKeyFingerprint,
  listWorkspaces,
} from 'src/logic-functions/utils/plusvibe-api';

export const connectionCallbackHandler = async () => {
  await listWorkspaces();
  return {
    externalAccountId: await getApiKeyFingerprint(),
    handle: 'PlusVibe',
  };
};

export default defineLogicFunction({
  universalIdentifier: CONNECTION_CALLBACK_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-connection-callback',
  timeoutSeconds: 30,
  handler: connectionCallbackHandler,
});
