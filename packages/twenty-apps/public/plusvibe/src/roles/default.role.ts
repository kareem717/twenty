import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';
import {
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  CAMPAIGN_UNIVERSAL_IDENTIFIER,
  ACTIVITY_UNIVERSAL_IDENTIFIER,
  WORKSPACE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'PlusVibe sync',
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  recordsPermissions: {
    canReadAllRecords: false,
    canCreateAllRecords: false,
    canUpdateAllRecords: false,
    canSoftDeleteAllRecords: false,
    canDestroyAllRecords: false,
    objects: [
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      CAMPAIGN_UNIVERSAL_IDENTIFIER,
      ACTIVITY_UNIVERSAL_IDENTIFIER,
      WORKSPACE_UNIVERSAL_IDENTIFIER,
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.message.universalIdentifier,
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.messageThread.universalIdentifier,
    ].map((objectUniversalIdentifier) => ({
      objectUniversalIdentifier,
      canReadAllRecords: true,
      canCreateAllRecords: true,
      canUpdateAllRecords: true,
      canSoftDeleteAllRecords: false,
      canDestroyAllRecords: false,
    })),
  },
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.APPLICATIONS],
});
