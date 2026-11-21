import {
  defineView,
  ViewType,
  ViewFilterOperand,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  MESSAGE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
  MESSAGE_SENDER_UNIVERSAL_IDENTIFIER,
  MESSAGE_SOURCE_UNIVERSAL_IDENTIFIER,
  MESSAGE_THREAD_ID_UNIVERSAL_IDENTIFIER,
  MESSAGE_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: MESSAGE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe emails',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: '68f22915-6cbf-4cdf-8d08-1598ad47e2a6',
      fieldMetadataUniversalIdentifier: '20202020-52d1-4036-b9ae-84bd722bb37a',
      position: 0,
      isVisible: true,
      size: 300,
    },
    {
      universalIdentifier: '442959cb-aaa3-49d6-9e9f-c456b371a8dc',
      fieldMetadataUniversalIdentifier: MESSAGE_SENDER_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '9ce44a9e-e0bd-4642-b198-dfa6e3971876',
      fieldMetadataUniversalIdentifier:
        MESSAGE_WORKSPACE_RELATION_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'c08e2006-bde4-4c2e-86c6-59e01f1fd3ca',
      fieldMetadataUniversalIdentifier:
        MESSAGE_CAMPAIGN_RELATION_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '2370b87b-0557-4ecc-8195-d79e52e7c642',
      fieldMetadataUniversalIdentifier: MESSAGE_THREAD_ID_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: '9d542b01-fc3d-468d-a79a-c09205c5528c',
      fieldMetadataUniversalIdentifier: MESSAGE_SOURCE_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: ['PLUSVIBE'],
    },
  ],
});
