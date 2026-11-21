import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CAMPAIGN_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeCampaignRecord',
  label: 'PlusVibe campaign',
  type: FieldType.RELATION,
  icon: 'IconPlug',
  relationTargetObjectMetadataUniversalIdentifier:
    CAMPAIGN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CAMPAIGN_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeCampaignRecordId',
  },
});
