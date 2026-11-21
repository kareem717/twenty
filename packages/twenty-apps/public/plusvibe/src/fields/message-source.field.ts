import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { MESSAGE_SOURCE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_SOURCE_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'source',
  label: 'Source',
  type: FieldType.SELECT,
  icon: 'IconPlug',
  options: [
    {
      id: '60747b6b-f0ba-4230-a231-17418630e7b4',
      value: 'PLUSVIBE',
      label: 'PlusVibe',
      position: 0,
      color: 'orange',
    },
  ],
});
