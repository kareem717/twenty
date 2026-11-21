import { defineView, ViewType } from 'twenty-sdk/define';
import {
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_VIEW_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: CAMPAIGN_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All PlusVibe campaigns',
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconSend',
  position: 0,
  fields: [
    {
      universalIdentifier: '4cc1d117-1b3a-4985-9072-6fdab7ccb278',
      fieldMetadataUniversalIdentifier: CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'c1d41c33-c615-49d9-8206-beb50d3b16a4',
      fieldMetadataUniversalIdentifier:
        CAMPAIGN_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '190c8a07-b2d1-4ac5-a3bd-ddb919b1c73e',
      fieldMetadataUniversalIdentifier: CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
  ],
});
