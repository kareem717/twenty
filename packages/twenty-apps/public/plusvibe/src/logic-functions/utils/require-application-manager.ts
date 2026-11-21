import { MetadataApiClient } from 'twenty-client-sdk/metadata';

export const canManageApplication = async () => {
  const { currentUser } = await new MetadataApiClient().query({
    currentUser: { currentUserWorkspace: { permissionFlags: true } },
  });
  return (currentUser.currentUserWorkspace?.permissionFlags ?? []).includes(
    'APPLICATIONS',
  );
};
