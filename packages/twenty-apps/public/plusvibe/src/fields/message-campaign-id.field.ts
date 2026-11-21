import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { MESSAGE_CAMPAIGN_ID_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MESSAGE_CAMPAIGN_ID_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  name: 'plusvibeCampaignId',
  label: 'PlusVibe Campaign ID',
  type: FieldType.TEXT,
  icon: 'IconKey',
});
