import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'threads',
  label: 'Conversations',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
