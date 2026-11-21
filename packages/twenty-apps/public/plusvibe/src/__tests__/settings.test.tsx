import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_DARK, THEME_LIGHT, ThemeProvider } from 'twenty-ui/theme';

const { get, post, query, navigate } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  query: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('twenty-client-sdk/metadata', () => ({
  MetadataApiClient: class {
    query = query;
  },
}));
vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: class {
    get = get;
    post = post;
  },
}));
vi.mock('twenty-sdk/front-component', () => ({
  t: (value: string) => value,
  navigate,
  AppPath: { SettingsCatchAll: '/settings/*' },
  useLocation: () => ({
    pathname: '/settings/applications/app-1',
    search: '',
    hash: '#setup',
  }),
}));

import { type PlusvibeSettingsStatus } from 'src/constants/plusvibe';
import { PlusvibeSettings } from 'src/front-components/PlusvibeSettings';

let status: PlusvibeSettingsStatus;

beforeEach(() => {
  vi.resetAllMocks();
  status = {
    isApiKeySet: true,
    isMailConnected: true,
    selectedWorkspaceIds: ['workspace-1'],
    workspaces: [
      { _id: 'workspace-1', name: 'Outbound sales' },
      { _id: 'workspace-2', name: 'Agency North America' },
    ],
    imports: {
      'workspace-1': {
        runId: 'run-1',
        phase: 'complete',
        processed: 50,
        updatedAt: '2026-11-20T10:00:00Z',
      },
    },
  };
  query.mockResolvedValue({ findOneApplication: { id: 'app-1' } });
  get.mockImplementation(async () => status);
  post.mockImplementation(
    async (path: string, body: { workspaceIds?: string[] }) => {
      if (body.workspaceIds)
        status = { ...status, selectedWorkspaceIds: body.workspaceIds };
      return { success: true };
    },
  );
});
afterEach(cleanup);

const renderSettings = (colorScheme: 'light' | 'dark' = 'light') =>
  render(
    <ThemeProvider
      colorScheme={colorScheme}
      theme={colorScheme === 'dark' ? THEME_DARK : THEME_LIGHT}
    >
      <PlusvibeSettings />
    </ThemeProvider>,
  );

describe('PlusVibe settings', () => {
  it.each(['light', 'dark'] as const)(
    'saves only the workspaces selected by the user in %s mode',
    async (colorScheme) => {
      const user = userEvent.setup();
      renderSettings(colorScheme);
      await screen.findByText('Agency North America');
      await user.click(screen.getByRole('button', { name: 'Select' }));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await screen.findByText('Sync settings saved.');
      expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
        workspaceIds: ['workspace-1', 'workspace-2'],
      });
    },
  );

  it('stops syncing and unlocks account reconnection', async () => {
    const user = userEvent.setup();
    renderSettings();
    await screen.findByText('Outbound sales');
    expect(
      screen
        .getByRole('button', { name: 'Reconnect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Stop syncing' }));
    await screen.findByText('Sync stopped. Existing records are kept.');
    expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
      workspaceIds: [],
    });
    expect(
      screen
        .getByRole('button', { name: 'Reconnect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('starts with one native API-key connection and returns to the setup page', async () => {
    status = {
      ...status,
      isApiKeySet: false,
      isMailConnected: false,
      selectedWorkspaceIds: [],
    };
    renderSettings();
    await screen.findByRole('button', { name: 'Connect PlusVibe' });
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'Connect PlusVibe' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(screen.queryByText('2. Choose workspaces')).toBeNull();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Connect PlusVibe' }));
    expect(navigate).toHaveBeenCalledWith(
      '/settings/*',
      { '*': 'applications/app-1/connect/plusvibe' },
      undefined,
      {
        state: { returnTo: '/settings/applications/app-1#setup' },
        surface: 'main',
      },
    );
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('API key')).toBeNull();
  });

  it('enables sync only after the user explicitly selects workspaces', async () => {
    status = { ...status, selectedWorkspaceIds: [], imports: {} };
    renderSettings();
    await screen.findByRole('button', { name: 'Enable sync' });
    expect(
      screen
        .getByRole('button', { name: 'Enable sync' })
        .hasAttribute('disabled'),
    ).toBe(true);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);
    await user.click(screen.getByRole('button', { name: 'Enable sync' }));
    await screen.findByText('Sync enabled. Import started.');
    expect(post).toHaveBeenCalledWith('/s/plusvibe/workspaces', {
      workspaceIds: ['workspace-1'],
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reconnects the same native account instead of adding a duplicate', async () => {
    status = {
      ...status,
      selectedWorkspaceIds: [],
      accountConnectionId: 'connection-1',
    };
    renderSettings();
    await screen.findByRole('button', { name: 'Reconnect PlusVibe' });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Reconnect PlusVibe' }));
    expect(navigate).toHaveBeenCalledWith(
      '/settings/*',
      expect.anything(),
      { reconnectingConnectedAccountId: 'connection-1' },
      expect.anything(),
    );
  });

  it('can stop sync and reconnect even when the provider credential stops working', async () => {
    status = {
      ...status,
      hasAccountError: true,
      isMailConnected: false,
      workspaces: [],
    };
    renderSettings();
    await screen.findByText(
      'Could not verify the PlusVibe account. Refresh or reconnect to continue.',
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Stop syncing' }));
    await screen.findByText('Sync stopped. Existing records are kept.');
    expect(
      screen
        .getByRole('button', { name: 'Connect PlusVibe' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('allows retry after a failed settings request', async () => {
    get.mockRejectedValueOnce(new Error('Unavailable'));
    renderSettings();
    await screen.findByText(
      'Could not load PlusVibe settings. Check your API key and try again.',
    );
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Outbound sales');
    expect(
      screen.queryByText(
        'Could not load PlusVibe settings. Check your API key and try again.',
      ),
    ).toBeNull();
  });

  it('reports failed saves without displaying success', async () => {
    post.mockRejectedValueOnce(new Error('Provider unavailable'));
    renderSettings();
    await screen.findByText('Outbound sales');
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        screen.getByText(
          'Could not update PlusVibe. Check your API key, workspace access, and webhook status, then retry.',
        ),
      ).toBeDefined(),
    );
    expect(screen.queryByText('Sync settings saved.')).toBeNull();
  });
});
