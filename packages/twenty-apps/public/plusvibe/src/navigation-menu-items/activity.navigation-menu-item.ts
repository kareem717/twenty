import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  ACTIVITY_NAVIGATION_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: ACTIVITY_NAVIGATION_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  targetObjectUniversalIdentifier: ACTIVITY_UNIVERSAL_IDENTIFIER,
});
