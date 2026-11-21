import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_ACTIVITIES_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CAMPAIGN_ACTIVITIES_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CAMPAIGN_UNIVERSAL_IDENTIFIER,
  name: 'activities',
  label: 'Activities',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    ACTIVITY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
