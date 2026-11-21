import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  THREAD_NAVIGATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: THREAD_NAVIGATION_UNIVERSAL_IDENTIFIER,
  name: 'PlusVibe conversations',
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
  viewUniversalIdentifier: THREAD_ALL_VIEW_UNIVERSAL_IDENTIFIER,
  position: 2,
});
