import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  WORKSPACE_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  WORKSPACE_LAST_SYNCED_AT_UNIVERSAL_IDENTIFIER,
  WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  WORKSPACE_SELECTED_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeWorkspace',
  namePlural: 'plusvibeWorkspaces',
  labelSingular: 'PlusVibe workspace',
  labelPlural: 'PlusVibe workspaces',
  icon: 'IconSettings',
  labelIdentifierFieldMetadataUniversalIdentifier:
    WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
    },
    {
      universalIdentifier: WORKSPACE_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      name: 'externalId',
      label: 'PlusVibe Workspace ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
    {
      universalIdentifier: WORKSPACE_SELECTED_UNIVERSAL_IDENTIFIER,
      name: 'isSelected',
      label: 'Sync enabled',
      type: FieldType.BOOLEAN,
      icon: 'IconToggleRight',
      defaultValue: false,
    },
    {
      universalIdentifier: WORKSPACE_LAST_SYNCED_AT_UNIVERSAL_IDENTIFIER,
      name: 'lastSyncedAt',
      label: 'Last synced at',
      type: FieldType.DATE_TIME,
      icon: 'IconCalendar',
      isNullable: true,
      defaultValue: null,
    },
  ],
});
