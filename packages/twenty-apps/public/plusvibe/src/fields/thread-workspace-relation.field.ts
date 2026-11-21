import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeWorkspaceRecord',
  label: 'PlusVibe workspace',
  type: FieldType.RELATION,
  icon: 'IconPlug',
  relationTargetObjectMetadataUniversalIdentifier:
    WORKSPACE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_THREAD_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeWorkspaceRecordId',
  },
});
