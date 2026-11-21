import { defineLogicFunction } from 'twenty-sdk/define';
import { type AuthorizeConnectionPayload } from 'twenty-sdk/logic-function';

import { CONNECTION_AUTHORIZE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { listWorkspaces } from 'src/logic-functions/utils/plusvibe-api';

export const connectionAuthorizeHandler = async ({
  callbackUrl,
}: AuthorizeConnectionPayload) => {
  await listWorkspaces();
  // The platform's signed callback binds this saved-key connection to the approving member.
  return { authorizationUrl: callbackUrl };
};

export default defineLogicFunction({
  universalIdentifier: CONNECTION_AUTHORIZE_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-connection-authorize',
  timeoutSeconds: 30,
  handler: connectionAuthorizeHandler,
});
