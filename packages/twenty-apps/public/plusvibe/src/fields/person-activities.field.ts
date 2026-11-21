import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  ACTIVITY_PERSON_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  PERSON_ACTIVITIES_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_ACTIVITIES_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'plusvibeActivities',
  label: 'PlusVibe events',
  type: FieldType.RELATION,
  icon: 'IconMail',
  relationTargetObjectMetadataUniversalIdentifier:
    ACTIVITY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    ACTIVITY_PERSON_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
