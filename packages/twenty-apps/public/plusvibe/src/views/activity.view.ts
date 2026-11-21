import { defineView, ViewType } from 'twenty-sdk/define';
import {
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  ACTIVITY_VIEW_UNIVERSAL_IDENTIFIER,
  ACTIVITY_NAME_UNIVERSAL_IDENTIFIER,
  ACTIVITY_EVENT_TYPE_UNIVERSAL_IDENTIFIER,
  ACTIVITY_EMAIL_UNIVERSAL_IDENTIFIER,
  ACTIVITY_OCCURRED_AT_UNIVERSAL_IDENTIFIER,
  ACTIVITY_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
  ACTIVITY_LABEL_UNIVERSAL_IDENTIFIER,
  ACTIVITY_PERSON_UNIVERSAL_IDENTIFIER,
  ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: ACTIVITY_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe bounce and label events',
  objectUniversalIdentifier: ACTIVITY_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMail',
  position: 0,
  fields: [
    {
      universalIdentifier: '3c67d022-cd43-4de1-87fb-46e3c07fab4f',
      fieldMetadataUniversalIdentifier: ACTIVITY_NAME_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '39a57d85-bc23-48ff-9427-6a583a80cf08',
      fieldMetadataUniversalIdentifier:
        ACTIVITY_EVENT_TYPE_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '7d13e881-3c41-449e-ae1a-61655c7260d9',
      fieldMetadataUniversalIdentifier: ACTIVITY_EMAIL_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '2b26f74e-9ac1-40a8-88e2-d68db4fec538',
      fieldMetadataUniversalIdentifier:
        ACTIVITY_OCCURRED_AT_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '847af8b5-1834-473d-95bb-ec391eb1055a',
      fieldMetadataUniversalIdentifier:
        ACTIVITY_WORKSPACE_NAME_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '6bbd6435-8eed-4af4-bb19-fa462ae19f46',
      fieldMetadataUniversalIdentifier: ACTIVITY_LABEL_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '1bf87d4f-ccf2-4e52-a3e5-50264c0cf0a6',
      fieldMetadataUniversalIdentifier: ACTIVITY_PERSON_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'e93551e1-d33b-4128-b4ee-990cab4a0966',
      fieldMetadataUniversalIdentifier: ACTIVITY_CAMPAIGN_UNIVERSAL_IDENTIFIER,
      position: 7,
      isVisible: true,
      size: 180,
    },
  ],
});
