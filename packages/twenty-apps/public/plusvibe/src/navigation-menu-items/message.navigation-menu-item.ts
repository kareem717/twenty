import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  MESSAGE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  MESSAGE_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: MESSAGE_NAVIGATION_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe emails',
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
  viewUniversalIdentifier: MESSAGE_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  position: 3,
});
