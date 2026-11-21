import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RoutePayload } from 'twenty-sdk/define';
vi.mock('src/logic-functions/utils/sync-workspace', () => ({
  syncWorkspace: vi.fn(),
}));

const {
  values,
  canManageApplication,
  listWorkspaces,
  registerWorkspace,
  startImport,
  findMailConnection,
} = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  canManageApplication: vi.fn(),
  listWorkspaces: vi.fn(),
  registerWorkspace: vi.fn(),
  startImport: vi.fn(),
  findMailConnection: vi.fn(),
}));
vi.mock('twenty-sdk/logic-function', async (importOriginal) => ({
  ...(await importOriginal<typeof import('twenty-sdk/logic-function')>()),
  kv: {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  },
}));
vi.mock('src/logic-functions/utils/require-application-manager', () => ({
  canManageApplication,
}));
vi.mock('src/logic-functions/utils/plusvibe-api', () => ({ listWorkspaces }));
vi.mock('src/logic-functions/utils/register-workspace', () => ({
  registerWorkspace,
}));
vi.mock('src/logic-functions/utils/native-email', () => ({
  findMailConnection,
}));
vi.mock('src/logic-functions/utils/start-import', () => ({ startImport }));

import { SELECTION_KEY } from 'src/constants/plusvibe';
import { selectWorkspacesHandler } from 'src/logic-functions/select-workspaces';

const WORKSPACE_ID = '65099a0dd96fae8ab61130c0';
const event = (workspaceIds: string[]): RoutePayload<unknown> => ({
  body: { workspaceIds },
  headers: {},
  queryStringParameters: {},
  pathParameters: {},
  isBase64Encoded: false,
  userWorkspaceId: 'user-1',
  requestContext: { http: { method: 'POST', path: '/' } },
});

beforeEach(() => {
  vi.clearAllMocks();
  values.clear();
  canManageApplication.mockResolvedValue(true);
  findMailConnection.mockResolvedValue({ id: 'connection-1' });
  listWorkspaces.mockResolvedValue([
    { _id: WORKSPACE_ID, name: 'Test workspace' },
  ]);
});

describe('PlusVibe workspace selection', () => {
  it('requires application management permission before any provider operation', async () => {
    canManageApplication.mockResolvedValueOnce(false);
    expect(await selectWorkspacesHandler(event([WORKSPACE_ID]))).toMatchObject({
      status: 403,
    });
    expect(listWorkspaces).not.toHaveBeenCalled();
    expect(registerWorkspace).not.toHaveBeenCalled();
  });

  it('does not enable a contacts-only sync without a native email connection', async () => {
    findMailConnection.mockResolvedValueOnce(undefined);
    expect(await selectWorkspacesHandler(event([WORKSPACE_ID]))).toMatchObject({
      status: 400,
    });
    expect(registerWorkspace).not.toHaveBeenCalled();
    expect(values.has(SELECTION_KEY)).toBe(false);
  });

  it('rejects workspaces outside the connected account', async () => {
    expect(
      await selectWorkspacesHandler(event(['65099a0dd96fae8ab61130c1'])),
    ).toMatchObject({ status: 400 });
    expect(registerWorkspace).not.toHaveBeenCalled();
    expect(values.has(SELECTION_KEY)).toBe(false);
  });

  it('allows stopping sync even when the provider connection is unavailable', async () => {
    values.set(SELECTION_KEY, [WORKSPACE_ID]);
    expect(await selectWorkspacesHandler(event([]))).toEqual({ success: true });
    expect(values.get(SELECTION_KEY)).toEqual([]);
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  it('registers and imports only the selected workspaces once', async () => {
    await selectWorkspacesHandler(event([WORKSPACE_ID, WORKSPACE_ID]));
    expect(registerWorkspace).toHaveBeenCalledOnce();
    expect(startImport).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(values.get(SELECTION_KEY)).toEqual([WORKSPACE_ID]);
  });

  it('preserves the previous selection if webhook setup fails', async () => {
    values.set(SELECTION_KEY, []);
    registerWorkspace.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(
      selectWorkspacesHandler(event([WORKSPACE_ID])),
    ).rejects.toThrow('Provider unavailable');
    expect(values.get(SELECTION_KEY)).toEqual([]);
    expect(startImport).not.toHaveBeenCalled();
  });
});
