import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  name: 'plusvibeReplyLabels',
  label: 'Reply labels',
  type: FieldType.MULTI_SELECT,
  icon: 'IconTags',
  options: [
    {
      id: '37e14443-ca91-44e6-8f9f-c2027a045295',
      value: 'INTERESTED',
      label: 'Interested',
      position: 0,
      color: 'green',
    },
    {
      id: 'c30bdd11-71f6-4be1-b87f-fc6c4a8cc6e7',
      value: 'NOT_INTERESTED',
      label: 'Not interested',
      position: 1,
      color: 'red',
    },
    {
      id: '5fdca643-7e0e-477c-bf80-6bc940b00fd7',
      value: 'UNSUBSCRIBED',
      label: 'Unsubscribed',
      position: 2,
      color: 'gray',
    },
    {
      id: '02f85c24-f029-474e-bb34-6f396776d0ba',
      value: 'OUT_OF_OFFICE',
      label: 'Out of office',
      position: 3,
      color: 'yellow',
    },
    {
      id: '17925c44-6b8b-4ed4-a996-5299f4c7890f',
      value: 'OTHER',
      label: 'Other',
      position: 4,
      color: 'gray',
    },
  ],
});
