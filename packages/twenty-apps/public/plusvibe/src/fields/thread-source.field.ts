import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { THREAD_SOURCE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'source',
  label: 'Source',
  type: FieldType.SELECT,
  icon: 'IconPlug',
  options: [
    {
      id: '38dbf1b1-cca0-4f81-8ef5-2ff4ddf4f479',
      value: 'PLUSVIBE',
      label: 'PlusVibe',
      position: 0,
      color: 'orange',
    },
  ],
});
