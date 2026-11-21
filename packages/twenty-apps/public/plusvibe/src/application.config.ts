import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'PlusVibe',
  description:
    'Sync selected PlusVibe workspaces and campaigns, import native email conversations on People, and filter threads by sender, campaign, replies and lead labels.',
  logo: 'public/plusvibe.png',
  author: 'Twenty',
  category: 'Communication',
});
