# PlusVibe for Twenty

Sync selected PlusVibe workspaces into native Twenty Messages and Message
Threads. Imported conversations appear on their People records. Dedicated
workspace and campaign records provide source context and normal Twenty filters.
Requires Twenty 2.60+, a PlusVibe account API key, and public HTTPS server routes.
The app icon was supplied by the workspace owner.

## Set up

```sh
yarn install
yarn twenty auth login --url https://your-twenty.example.com --name your-workspace
yarn twenty app apply --create --no-prune --remote your-workspace
```

Open the app's Settings tab and follow the three steps:

1. **Connect PlusVibe.** Twenty's native connection form accepts the PlusVibe API
   key and stores it encrypted. It validates the key, creates the messaging
   connection, and returns to setup. No PlusVibe OAuth redirect or app-variable
   key entry is involved.
2. **Choose workspaces.** No workspace is selected automatically.
3. **Enable sync.** This saves the selection, registers webhooks, and queues the
   initial import. Imported emails are shared with the Twenty workspace through
   channels with `SHARE_EVERYTHING` visibility.

Change the selection with **Save changes**, refresh history with **Import again**,
or use **Stop syncing** to keep existing records while stopping future imports.
Stop syncing before reconnecting with a different account. Reconnecting an
existing native account updates that connection instead of adding a duplicate.
A daily refresh also runs at 03:00 UTC.

Existing installs reuse their approved messaging connection and saved key;
users are not required to reconnect for this update. Native connection provider
type and messaging provider linkage are immutable in Twenty, so the API-key
provider has a new identity. Deploy upgrades with `--no-prune` to preserve the
old provider, existing email channels, and legacy secret variable. New installs
only declare the native API-key provider and have no secret application variable.
The runtime prefers a native API-key credential, with saved-variable fallback
only for existing installs. Moving the same key to the native provider keeps
legacy messaging channels to avoid duplicating already imported messages.

## Records and filters

- **People:** new contacts receive names, primary email, and job title. Existing
  contacts match by primary email and retain their fields. Source lead mappings
  keep alternate-address replies linked to the same person.
- **PlusVibe workspaces:** source workspace ID, name, and whether sync is selected.
- **PlusVibe campaigns:** source campaign ID, name, status, and workspace relation.
- **Messages:** actual native email records, with participants and thread links.
  Custom fields include Source = PlusVibe, PlusVibe Workspace ID, PlusVibe Sender,
  PlusVibe Campaign ID, PlusVibe Thread ID when supplied, the message identity,
  and relations to the workspace and campaign records.
- **Message Threads:** native conversations linked to their person, workspace,
  and campaign. Additional fields hold sender, source IDs, Has lead replies,
  Latest reply label, Reply labels, and Latest email at.
- **PlusVibe events:** the earlier activity object now holds bounce and label
  events. Email bodies are stored as native Messages, not activity copies.

The **PlusVibe emails** and **PlusVibe conversations** navigation items open
native tables with Twenty's normal filters. Conversations include saved views
for **Replied**, **Interested**, and **Not interested**. Combine these with sender,
workspace, campaign, or thread ID filters. Reply labels preserve the known
Interested / Not interested / Unsubscribed / Out of office classifications seen
on a conversation, even after a later send. Latest reply label preserves the
provider's current label string, including custom labels; unrecognized history
labels are categorized as Other.

## Import and live updates

Campaigns and leads import in checkpointed pages. Each lead queues an import of
its campaign-sent email history. A separate pass imports Unibox messages and
archived messages. Bodies are converted to plain text for Twenty's native email
renderer. Attachments are not imported yet.

New sends and replies arrive through signed webhooks. HMAC-SHA256 is checked
against the exact raw body before any message writes. Selected workspace and
registration identity are also checked. The native ingestion API handles message
deduplication, participants, thread targets on People, and message visibility.
Each sending email address gets a native channel, while message and thread
identities are scoped to their PlusVibe workspace. Where PlusVibe
omits a thread ID on campaign sends, the connector groups by workspace, sender,
lead, and campaign; a later source thread ID can bind to that conversation.
Missing source IDs are left blank rather than presented as real PlusVibe IDs.

Thread updates preserve reply history and use an optimistic update to avoid
losing classifications during concurrent deliveries. Live label events also
update matching native threads. Existing webhooks retain the label subscriptions
present when they were created; new PlusVibe label definitions require updating
the source webhook subscription.

Transient failures use Twenty's `RetryableLogicFunctionError` protocol; a plain
Error alone does not make its queue retry. Permanent discovery failures are
marked Failed. Campaign-email job failures are exposed in settings. Discovery
can finish while individual email-history jobs are still running, so settings
say so. Execution logs provide per-job details. Both current paginated API
responses and legacy array pages are supported. Legacy lists continue using the
last record ID until an empty page, with repeated cursors rejected.

**Stop syncing** clears the selection. Queued jobs and deliveries check it before
processing, and existing CRM records remain. Provider webhooks are retained for
reuse. The importer does not send mail or change campaigns or leads in PlusVibe;
reply sending from Twenty is not enabled by this messaging provider.

## Development

```sh
yarn typecheck
yarn test
yarn lint
yarn twenty app build
```

Definition files use the direct default exports required by Twenty's loader;
components, handlers, and utilities use named exports. SDK and UI packages are
pinned to 2.60.0. CLI 2.59.0 was retained because 2.60.0 was inside the repository's
dependency age gate during setup.

Protocol references: [workspaces](https://developer.plusvibe.ai/get-workspaces-38494472e0),
[campaign sends](https://developer.plusvibe.ai/get-campaign-emails-38494482e0),
[Unibox messages](https://developer.plusvibe.ai/get-emails-38494515e0),
[webhooks](https://developer.plusvibe.ai/webhooks-overview-2268181m0).

An application manager can execute `plusvibe-sync-health` with a selected
`workspaceId` to check source pagination and native message/thread counts without
returning contact records or email content.
