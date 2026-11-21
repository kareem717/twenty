export const PLUSVIBE_API_URL = 'https://api.plusvibe.ai/api/v1';
export const ACCOUNT_CONNECTION_KEY = 'plusvibe:account-connection';
export const ACCOUNT_PROVIDER_NAME = 'plusvibe';
export const SELECTION_KEY = 'plusvibe:selected-workspaces';
export const getRegistrationKey = (workspaceId: string) =>
  `plusvibe:registration:${workspaceId}`;
export const getClaimKey = (registrationId: string) =>
  `plusvibe:claim:${registrationId}`;
export const getImportKey = (workspaceId: string) =>
  `plusvibe:import:${workspaceId}`;
export const getEmailFailureKey = (workspaceId: string) =>
  `plusvibe:email-failure:${workspaceId}`;
export const getLeadPersonKey = (workspaceId: string, leadId: string) =>
  `plusvibe:person:${workspaceId}:${leadId}`;

export const WEBHOOK_EVENT_TYPES = [
  'ALL_EMAIL_REPLIES',
  'EMAIL_SENT',
  'UNIBOX_EMAIL_SENT',
  'BOUNCED_EMAIL',
];

export type PlusvibeWorkspace = { _id: string; name: string };
export type PlusvibeRegistration = {
  registrationId: string;
  secret: string;
  url: string;
  workspaceId: string;
  workspaceName: string;
  apiKeyFingerprint: string;
  webhookId?: string;
};
export type PlusvibeImportState = {
  version?: number;
  runId: string;
  phase:
    | 'campaigns'
    | 'leads'
    | 'emails'
    | 'archivedEmails'
    | 'awaitingConnection'
    | 'complete'
    | 'failed';
  cursor?: string;
  processed: number;
  updatedAt: string;
};
export type PlusvibeSettingsStatus = {
  jobs?: {
    jobId: string;
    state: string;
    attemptsMade: number;
    failedReason?: string | null;
  }[];
  isMailConnected?: boolean;
  accountConnectionId?: string;
  hasAccountError?: boolean;
  emailFailures?: Record<string, { runId: string; failedAt: string } | null>;
  isApiKeySet: boolean;
  workspaces: PlusvibeWorkspace[];
  selectedWorkspaceIds: string[];
  imports: Record<string, PlusvibeImportState | null>;
};
