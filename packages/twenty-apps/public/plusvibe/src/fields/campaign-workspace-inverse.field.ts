import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: WORKSPACE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WORKSPACE_UNIVERSAL_IDENTIFIER,
  name: 'campaigns',
  label: 'Campaigns',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    CAMPAIGN_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    CAMPAIGN_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
