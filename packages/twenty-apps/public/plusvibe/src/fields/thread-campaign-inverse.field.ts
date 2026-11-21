import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  CAMPAIGN_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CAMPAIGN_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  name: 'threads',
  label: 'Conversations',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
