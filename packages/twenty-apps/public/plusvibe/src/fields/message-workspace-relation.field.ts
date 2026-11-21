import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'plusvibeWorkspaceRecord',
  label: 'PlusVibe workspace',
  type: FieldType.RELATION,
  icon: 'IconPlug',
  relationTargetObjectMetadataUniversalIdentifier:
    WORKSPACE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_MESSAGE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'plusvibeWorkspaceRecordId',
  },
});
