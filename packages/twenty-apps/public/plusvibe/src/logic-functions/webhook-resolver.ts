import { isNonEmptyString } from '@sniptt/guards';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import {
  kv,
  Response,
  type ServerRouteResolverResult,
} from 'twenty-sdk/logic-function';

import { getClaimKey } from 'src/constants/plusvibe';
import {
  WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER,
  WEBHOOK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export const webhookResolverHandler = async (
  event: RoutePayload<unknown>,
): Promise<ServerRouteResolverResult> => {
  const registrationId = event.queryStringParameters.registrationId;
  if (!isNonEmptyString(registrationId))
    return new Response({ error: 'Missing registration' }, { status: 400 });
  const workspaceId = await kv.get<string>(getClaimKey(registrationId), {
    scope: 'SERVER',
  });
  if (!isNonEmptyString(workspaceId))
    return new Response({ error: 'Unknown registration' }, { status: 404 });
  return {
    workspaceId,
    targetLogicFunctionUniversalIdentifier: WEBHOOK_UNIVERSAL_IDENTIFIER,
    payload: event,
  };
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_RESOLVER_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-webhook-resolver',
  timeoutSeconds: 15,
  handler: webhookResolverHandler,
  serverRouteTriggerSettings: {
    httpMethods: ['POST'],
    forwardedRequestHeaders: ['signature'],
  },
});
