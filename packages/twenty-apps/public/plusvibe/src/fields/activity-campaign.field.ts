import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_ACTIVITIES_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: ACTIVITY_UNIVERSAL_IDENTIFIER,
  name: 'campaign',
  label: 'Campaign',
  type: FieldType.RELATION,
  icon: 'IconSend',
  relationTargetObjectMetadataUniversalIdentifier:
    CAMPAIGN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CAMPAIGN_ACTIVITIES_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'campaignId',
  },
});
