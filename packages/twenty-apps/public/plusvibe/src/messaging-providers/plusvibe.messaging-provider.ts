import { defineMessagingProvider } from 'twenty-sdk/define';

import {
  API_KEY_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineMessagingProvider({
  universalIdentifier: API_KEY_MESSAGING_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-native-emails',
  displayName: 'PlusVibe emails',
  conversationStyle: 'email',
  connectionProvider: {
    universalIdentifier: API_KEY_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  },
});
