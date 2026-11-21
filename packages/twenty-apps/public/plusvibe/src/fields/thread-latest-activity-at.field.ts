import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { THREAD_LATEST_ACTIVITY_AT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_LATEST_ACTIVITY_AT_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeLatestActivityAt',
  label: 'Latest email at',
  type: FieldType.DATE_TIME,
  icon: 'IconCalendar',
  isNullable: true,
  defaultValue: null,
});
