import { defineView, ViewType } from 'twenty-sdk/define';
import {
  WORKSPACE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  WORKSPACE_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  WORKSPACE_LAST_SYNCED_AT_UNIVERSAL_IDENTIFIER,
  WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  WORKSPACE_SELECTED_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: WORKSPACE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe workspaces',
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: '521fb188-7e9d-495b-9e4d-c6f08201adbb',
      fieldMetadataUniversalIdentifier: WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'eb31dc5a-9a0a-4f62-9489-513524f8a935',
      fieldMetadataUniversalIdentifier:
        WORKSPACE_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7f079fd4-519c-4def-9777-aa84c13f2f00',
      fieldMetadataUniversalIdentifier: WORKSPACE_SELECTED_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '4b7a1554-8462-4f5c-bf88-d5c8db6acce7',
      fieldMetadataUniversalIdentifier:
        WORKSPACE_LAST_SYNCED_AT_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [],
});
