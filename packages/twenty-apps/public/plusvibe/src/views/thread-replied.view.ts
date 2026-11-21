import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
  THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
  THREAD_REPLIED_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
  THREAD_SENDER_UNIVERSAL_IDENTIFIER,
  THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
  THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
  THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: THREAD_REPLIED_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe \u00b7 Replied',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 1,
  fields: [
    {
      universalIdentifier: '0eff55f0-c760-4174-bbf3-b71d738956a4',
      fieldMetadataUniversalIdentifier: 'a8ddbf8c-1137-45d1-b89e-5ffbd83f67c8',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '4e562f2e-d4b0-4c85-972f-a334cee163ff',
      fieldMetadataUniversalIdentifier: THREAD_SENDER_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'a20f42e5-447d-4bc6-9f30-d0957a6f4203',
      fieldMetadataUniversalIdentifier:
        THREAD_PERSON_RELATION_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '50b33081-8625-46a0-b51e-c5897afbae25',
      fieldMetadataUniversalIdentifier:
        THREAD_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '4011c173-9452-4633-a41a-7e97cdce6fec',
      fieldMetadataUniversalIdentifier:
        THREAD_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '95fc2ea4-8d16-4eeb-9ec1-02ac5bad90cc',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '9101e22f-793b-427b-b937-f382f6ce0da3',
      fieldMetadataUniversalIdentifier:
        THREAD_REPLY_LABELS_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7a94253b-a983-4e74-90a3-7334dc23b896',
      fieldMetadataUniversalIdentifier: THREAD_THREAD_ID_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: '4ab8c58f-8e02-458c-8f57-e1694fc1d6dc',
      fieldMetadataUniversalIdentifier: THREAD_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
    {
      universalIdentifier: '619c0dac-bd6e-4b3b-b476-d6f4162654e1',
      fieldMetadataUniversalIdentifier: THREAD_HAS_REPLIES_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: true,
    },
  ],
});
