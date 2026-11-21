import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk/define';
import {
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  name: 'workspaceRecord',
  label: 'Workspace',
  type: FieldType.RELATION,
  icon: 'IconPlug',
  relationTargetObjectMetadataUniversalIdentifier:
    WORKSPACE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    WORKSPACE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'workspaceRecordId',
  },
});
