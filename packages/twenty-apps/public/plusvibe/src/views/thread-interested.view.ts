import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  THREAD_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_INTERESTED_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe \u00b7 Interested',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 2,
  fields: [
    {
      universalIdentifier: 'd1332f20-4aba-4d94-bf24-450f30aa8da4',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '4876dcba-0531-4a7c-8652-45ef8605bb02',
      fieldMetadataUniversalIdentifier: THREAD_SENDER_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'e18158c8-3629-494e-a15f-8c4884f43aeb',
      fieldMetadataUniversalIdentifier:
        THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'c82b912c-a025-40cc-8f6a-779cd0960dab',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '56616a08-3876-41d2-a2f9-23ec58a50721',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'bfe4ba8b-c7ef-41c1-b8ea-09c1adc78762',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'b088a205-1dbd-463b-9f15-8b3ecfd857d6',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '8dd44d1e-f565-4f6c-9ccf-4882d854d770',
      fieldMetadataUniversalIdentifier: THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: '868f60c6-6c64-4271-9226-e8fb29f1e483',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
    {
      universalIdentifier: '98aeef7b-1521-4800-9204-897eb154ebee',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.CONTAINS,
      value: ['INTERESTED'],
    },
  ],
});
