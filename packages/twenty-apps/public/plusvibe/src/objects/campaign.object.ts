import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_ID_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_LINK_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  nameSingular: 'plusvibeCampaign',
  namePlural: 'plusvibeCampaigns',
  labelSingular: 'PlusVibe campaign',
  labelPlural: 'PlusVibe campaigns',
  icon: 'IconSend',
  labelIdentifierFieldMetadataUniversalIdentifier:
    CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CAMPAIGN_NAME_UNIVERSAL_IDENTIFIER,
      name: 'name',
      label: 'Name',
      type: FieldType.TEXT,
      icon: 'IconAbc',
    },
    {
      universalIdentifier: CAMPAIGN_EXTERNAL_ID_UNIVERSAL_IDENTIFIER,
      name: 'externalId',
      label: 'PlusVibe ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
    {
      universalIdentifier: CAMPAIGN_WORKSPACE_ID_UNIVERSAL_IDENTIFIER,
      name: 'workspaceId',
      label: 'Workspace ID',
      type: FieldType.TEXT,
      icon: 'IconKey',
    },
    {
      universalIdentifier: CAMPAIGN_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
      name: 'workspaceName',
      label: 'Workspace',
      type: FieldType.TEXT,
      icon: 'IconSettings',
    },
    {
      universalIdentifier: CAMPAIGN_STATUS_UNIVERSAL_IDENTIFIER,
      name: 'status',
      label: 'Status',
      type: FieldType.TEXT,
      icon: 'IconProgress',
    },
    {
      universalIdentifier: CAMPAIGN_LINK_UNIVERSAL_IDENTIFIER,
      name: 'campaignLink',
      label: 'Open in PlusVibe',
      type: FieldType.LINKS,
      icon: 'IconLink',
    },
  ],
});
