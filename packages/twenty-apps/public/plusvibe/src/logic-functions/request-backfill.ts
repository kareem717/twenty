import { defineLogicFunction } from 'twenty-sdk/define';
import { kv, Response } from 'twenty-sdk/logic-function';

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { REQUEST_BACKFILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { startImport } from 'src/logic-functions/utils/start-import';

export const requestBackfillHandler = async () => {
  if (!(await canManageApplication()))
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? [])
    await startImport(workspaceId);
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: REQUEST_BACKFILL_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-request-backfill',
  timeoutSeconds: 60,
  handler: requestBackfillHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/import',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
