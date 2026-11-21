import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { AppPath, navigate, t, useLocation } from 'twenty-sdk/front-component';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  ACCOUNT_PROVIDER_NAME,
  type PlusvibeSettingsStatus,
} from 'src/constants/plusvibe';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${() => themeCssVariables.spacing[2]};
`;

const StyledWorkspaceRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${() => themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  gap: ${() => themeCssVariables.spacing[2]};
  padding: ${() => themeCssVariables.spacing[2]} 0;
`;

const StyledHint = styled.span`
  color: ${() => themeCssVariables.font.color.secondary};
  font-size: ${() => themeCssVariables.font.size.sm};
`;

export const PlusvibeSettings = () => {
  const [status, setStatus] = useState<PlusvibeSettingsStatus>();
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);
  const location = useLocation();
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const loadStatus = async () => {
    const result = await new RestApiClient().get<PlusvibeSettingsStatus>(
      '/s/plusvibe/status',
    );
    setStatus(result);
    setWorkspaceIds(result.selectedWorkspaceIds);
  };

  useEffect(() => {
    let cancelled = false;
    new RestApiClient()
      .get<PlusvibeSettingsStatus>('/s/plusvibe/status')
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setWorkspaceIds(result.selectedWorkspaceIds);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'Could not load PlusVibe settings. Check your API key and try again.',
            ),
          );
      })
      .finally(() => {
        if (!cancelled) setIsBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = async (action: () => Promise<void>, message?: string) => {
    setIsBusy(true);
    setError(undefined);
    setFeedback(undefined);
    try {
      await action();
      await loadStatus();
      setFeedback(message);
    } catch {
      setError(
        t(
          'Could not update PlusVibe. Check your API key, workspace access, and webhook status, then retry.',
        ),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const connect = async () => {
    const client = new MetadataApiClient();
    const result = await client.query({
      findOneApplication: {
        __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
        id: true,
      },
    });
    const applicationId = result.findOneApplication?.id;
    if (!applicationId)
      throw new Error('PlusVibe application is not installed');
    const returnTo = location
      ? `${location.pathname}${location.search}${location.hash}`
      : `/settings/applications/${applicationId}`;
    await navigate(
      AppPath.SettingsCatchAll,
      { '*': `applications/${applicationId}/connect/${ACCOUNT_PROVIDER_NAME}` },
      status?.accountConnectionId
        ? { reconnectingConnectedAccountId: status.accountConnectionId }
        : undefined,
      { state: { returnTo }, surface: 'main' },
    );
  };

  const saveSelection = async (selection: string[]) => {
    await new RestApiClient().post('/s/plusvibe/workspaces', {
      workspaceIds: selection,
    });
  };
  const isConnected = Boolean(
    status?.isApiKeySet && status.isMailConnected && !status.hasAccountError,
  );
  const hasSelection = (status?.selectedWorkspaceIds.length ?? 0) > 0;

  return (
    <StyledStack>
      {error && (
        <InlineBanner status="error" layout="compact">
          {error}
        </InlineBanner>
      )}
      {status?.hasAccountError && (
        <InlineBanner status="error" layout="compact">
          {t(
            'Could not verify the PlusVibe account. Refresh or reconnect to continue.',
          )}
        </InlineBanner>
      )}
      {feedback && (
        <InlineBanner status="success" layout="compact">
          {feedback}
        </InlineBanner>
      )}
      <Section.Root>
        <Section.Header
          title={t('1. Connect PlusVibe')}
          description={t(
            'Enter your PlusVibe API key once, then choose the workspaces to sync.',
          )}
        />
        <StyledStack>
          <StyledRow>
            {isConnected && <span>{t('PlusVibe connected.')}</span>}
            <Button
              variant={isConnected ? 'outline' : 'solid'}
              color={isConnected ? 'neutral' : 'accent'}
              disabled={isBusy || hasSelection}
              onClick={() => runAction(connect)}
            >
              {isConnected ? t('Reconnect PlusVibe') : t('Connect PlusVibe')}
            </Button>
            {!isConnected && hasSelection && (
              <Button
                disabled={isBusy}
                onClick={() =>
                  runAction(
                    () => saveSelection([]),
                    t('Sync stopped. Existing records are kept.'),
                  )
                }
              >
                {t('Stop syncing')}
              </Button>
            )}
            <Button disabled={isBusy} onClick={() => runAction(async () => {})}>
              {t('Refresh')}
            </Button>
          </StyledRow>
          {hasSelection && (
            <StyledHint>
              {t('Stop syncing before changing the connected account.')}
            </StyledHint>
          )}
        </StyledStack>
      </Section.Root>
      {isConnected && status && (
        <Section.Root>
          <Section.Header
            title={t('2. Choose workspaces')}
            description={t('Only the workspaces you select will sync.')}
          />
          <StyledStack>
            {status.workspaces.length === 0 && (
              <StyledHint>{t('No accessible workspaces found.')}</StyledHint>
            )}
            {status.workspaces.map((workspace) => {
              const selected = workspaceIds.includes(workspace._id);
              const importState = status.imports[workspace._id];
              return (
                <StyledWorkspaceRow key={workspace._id}>
                  <StyledStack>
                    <span>{workspace.name}</span>
                    {importState && (
                      <StyledHint>
                        {importState.phase === 'complete'
                          ? t(
                              'Contact discovery complete; email history may still be importing',
                            )
                          : importState.phase === 'failed'
                            ? t('Import failed. Retry the import.')
                            : importState.phase === 'awaitingConnection'
                              ? t('Reconnect PlusVibe to continue')
                              : t('Import in progress')}
                        {' · '}
                        {importState.processed} {t('records processed')}
                      </StyledHint>
                    )}
                    {status.emailFailures?.[workspace._id] &&
                      status.emailFailures[workspace._id]?.runId ===
                        importState?.runId && (
                        <StyledHint>
                          {t(
                            'Some email history failed to import. Retry the import or check execution logs.',
                          )}
                        </StyledHint>
                      )}
                  </StyledStack>
                  <Button
                    disabled={isBusy}
                    aria-pressed={selected}
                    onClick={() =>
                      setWorkspaceIds((current) =>
                        selected
                          ? current.filter((id) => id !== workspace._id)
                          : [...current, workspace._id],
                      )
                    }
                  >
                    {selected ? t('Selected') : t('Select')}
                  </Button>
                </StyledWorkspaceRow>
              );
            })}
          </StyledStack>
        </Section.Root>
      )}
      {isConnected && status && status.workspaces.length > 0 && (
        <Section.Root>
          <Section.Header
            title={t('3. Enable sync')}
            description={t(
              'Import contacts, campaigns, sent emails and replies. Imported emails are shared with your Twenty workspace.',
            )}
          />
          <StyledStack>
            <StyledRow>
              <Button
                variant="solid"
                color="accent"
                disabled={isBusy || workspaceIds.length === 0}
                onClick={() =>
                  runAction(
                    () => saveSelection(workspaceIds),
                    hasSelection
                      ? t('Sync settings saved.')
                      : t('Sync enabled. Import started.'),
                  )
                }
              >
                {hasSelection ? t('Save changes') : t('Enable sync')}
              </Button>
              {hasSelection && (
                <>
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      runAction(async () => {
                        await new RestApiClient().post(
                          '/s/plusvibe/import',
                          {},
                        );
                      }, t('Import queued.'))
                    }
                  >
                    {t('Import again')}
                  </Button>
                  <Button
                    disabled={isBusy}
                    onClick={() =>
                      runAction(
                        () => saveSelection([]),
                        t('Sync stopped. Existing records are kept.'),
                      )
                    }
                  >
                    {t('Stop syncing')}
                  </Button>
                </>
              )}
            </StyledRow>
            <StyledHint>
              {t(
                'Live updates arrive through webhooks. Filter conversations by sender, campaign, replies and labels. Stopping sync keeps existing CRM records.',
              )}
            </StyledHint>
          </StyledStack>
        </Section.Root>
      )}
    </StyledStack>
  );
};
