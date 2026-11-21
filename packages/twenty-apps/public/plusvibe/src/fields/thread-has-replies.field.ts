import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeHasReplies',
  label: 'Has lead replies',
  type: FieldType.BOOLEAN,
  icon: 'IconMessageReply',
  defaultValue: false,
});
