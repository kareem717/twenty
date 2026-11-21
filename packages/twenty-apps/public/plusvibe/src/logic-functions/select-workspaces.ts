import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { kv, Response } from 'twenty-sdk/logic-function';
import { z } from 'zod';

import {
  getRegistrationKey,
  SELECTION_KEY,
  type PlusvibeRegistration,
} from 'src/constants/plusvibe';
import { SELECT_WORKSPACES_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { startImport } from 'src/logic-functions/utils/start-import';
import { listWorkspaces } from 'src/logic-functions/utils/plusvibe-api';
import { registerWorkspace } from 'src/logic-functions/utils/register-workspace';
import { canManageApplication } from 'src/logic-functions/utils/require-application-manager';
import { findMailConnection } from 'src/logic-functions/utils/native-email';
import { syncWorkspace } from 'src/logic-functions/utils/sync-workspace';

export const selectWorkspacesHandler = async (event: RoutePayload<unknown>) => {
  if (!(await canManageApplication())) {
    return new Response(
      { error: 'Application management permission is required' },
      { status: 403 },
    );
  }
  const input = z
    .object({
      workspaceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(50),
    })
    .safeParse(event.body);
  if (!input.success) {
    return new Response(
      { error: 'Invalid workspace selection' },
      { status: 400 },
    );
  }
  const selectedWorkspaceIds = [...new Set(input.data.workspaceIds)];
  const previousSelection = (await kv.get<string[]>(SELECTION_KEY)) ?? [];
  const disableRemovedWorkspaces = async () => {
    for (const workspaceId of previousSelection.filter(
      (id) => !selectedWorkspaceIds.includes(id),
    )) {
      const registration = await kv.get<PlusvibeRegistration>(
        getRegistrationKey(workspaceId),
      );
      if (registration)
        await syncWorkspace(
          { _id: workspaceId, name: registration.workspaceName },
          false,
        );
    }
  };
  if (selectedWorkspaceIds.length === 0) {
    await kv.set(SELECTION_KEY, []);
    await disableRemovedWorkspaces();
    return { success: true };
  }
  if (!(await findMailConnection()))
    return new Response(
      { error: 'Connect PlusVibe before enabling sync' },
      { status: 400 },
    );
  const workspaces = await listWorkspaces();
  if (
    selectedWorkspaceIds.some(
      (id) => !workspaces.some((workspace) => workspace._id === id),
    )
  ) {
    return new Response(
      { error: 'A selected workspace is inaccessible' },
      { status: 400 },
    );
  }
  for (const workspace of workspaces.filter((workspace) =>
    selectedWorkspaceIds.includes(workspace._id),
  )) {
    await registerWorkspace(workspace);
  }
  await kv.set(SELECTION_KEY, selectedWorkspaceIds);
  await disableRemovedWorkspaces();
  for (const workspace of workspaces.filter((workspace) =>
    selectedWorkspaceIds.includes(workspace._id),
  ))
    await syncWorkspace(workspace, true);
  for (const workspaceId of selectedWorkspaceIds.filter(
    (id) => !previousSelection.includes(id),
  )) {
    await startImport(workspaceId);
  }
  return { success: true };
};

export default defineLogicFunction({
  universalIdentifier: SELECT_WORKSPACES_UNIVERSAL_IDENTIFIER,
  name: 'plusvibe-select-workspaces',
  timeoutSeconds: 300,
  handler: selectWorkspacesHandler,
  httpRouteTriggerSettings: {
    path: '/plusvibe/workspaces',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
