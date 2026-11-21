import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe conversations',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: 'cde23d25-d881-4df7-81fe-981c1b1c9487',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: 'e621ee24-0467-4cc6-b35e-df43891b4962',
      fieldMetadataUniversalIdentifier: THREAD_SENDER_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '2ea90c8f-0f49-48fc-a53a-a69cc8127f90',
      fieldMetadataUniversalIdentifier:
        THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'f0bfe94e-5c58-49f6-8e43-37715bc6dbb9',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'cae5c60a-2a27-430d-9ffe-7a494357de4c',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7113d157-05cb-48f3-acf9-66f0baeb9a38',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '9f70d1a0-4720-40fc-9568-25cb1e45db47',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'a3c22e35-87e6-4178-b342-a4d5f3327e59',
      fieldMetadataUniversalIdentifier: THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: '68408949-5ce0-4b76-aa16-6c67d6b5d204',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
  ],
});
