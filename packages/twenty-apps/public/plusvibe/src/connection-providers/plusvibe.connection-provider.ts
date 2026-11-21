import { defineConnectionProvider } from 'twenty-sdk/define';

import { ACCOUNT_PROVIDER_NAME } from 'src/constants/plusvibe';
import {
  API_KEY_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER,
  IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineConnectionProvider({
  universalIdentifier: API_KEY_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: ACCOUNT_PROVIDER_NAME,
  displayName: 'PlusVibe',
  logo: 'public/plusvibe.png',
  type: 'api-key',
  scope: 'WORKSPACE',
  identifyAccountLogicFunction: {
    universalIdentifier: IDENTIFY_ACCOUNT_UNIVERSAL_IDENTIFIER,
  },
  onConnectLogicFunction: {
    universalIdentifier: CONNECTION_ON_CONNECT_UNIVERSAL_IDENTIFIER,
  },
});
