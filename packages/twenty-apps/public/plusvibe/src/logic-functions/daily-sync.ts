import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { DAILY_SYNC_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { startImport } from 'src/logic-functions/utils/start-import';

export const dailySyncHandler = async () => {
  for (const workspaceId of (await kv.get<string[]>(SELECTION_KEY)) ?? [])
    await startImport(workspaceId);
};

export default defineLogicFunction({
  universalIdentifier: DAILY_SYNC_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-daily-sync',
  timeoutSeconds: 60,
  handler: dailySyncHandler,
  cronTriggerSettings: { pattern: '0 3 * * *' },
});
