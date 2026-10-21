# Shared self-hosted deployment operations

This runbook covers one Docker Compose server, worker, PostgreSQL and Redis stack,
with local file storage, workspace domains, SMTP and encrypted Backblaze backups.
Keep the installation's domain inventory and credential values outside this public
repository. Pin the Twenty image tag and retain that version in each backup.

## Domains and API URL

Example topology:

| Purpose | URL |
| --- | --- |
| Frontend domain namespace | `https://example.com` |
| Shared login and API | `https://crm-login.example.com` |
| First workspace | `https://crm.example.com` |
| Another workspace's canonical URL | `https://sales.example.com` |
| Another workspace's custom URL | `https://crm.other-company.com` |

Use this override for **both** `server` and `worker`:

```yaml
services:
  server:
    environment: &shared-domains
      SERVER_URL: https://crm-login.example.com
      FRONTEND_URL: https://example.com
      IS_MULTIWORKSPACE_ENABLED: 'true'
      DEFAULT_SUBDOMAIN: crm-login
      IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS: 'true'
      AUTH_GOOGLE_CALLBACK_URL: https://crm-login.example.com/auth/google/redirect
      AUTH_GOOGLE_APIS_CALLBACK_URL: https://crm-login.example.com/auth/google-apis/get-access-token
  worker:
    environment: *shared-domains
```

`FRONTEND_URL` supplies the root namespace used to build workspace subdomains.
`SERVER_URL` must reach Twenty's API: local-storage upload targets and signed file
URLs use it directly. Setting it to an apex domain that serves a separate website
causes image uploads to fail even when ordinary CRM navigation works.

Create the first server administrator before restricting workspace creation.
Create workspaces and change their subdomains through Twenty's UI. The deployed
v2.50.0 release supports up to five workspaces without an Organization key.

Bind the API to loopback behind a reverse proxy. Keep PostgreSQL and Redis on the
private Compose network. Configure HTTPS routes for the login hostname, canonical
workspace hostnames and custom domains; preserve the original Host header.

## Custom domains

1. Enable Cloudflare for SaaS on the frontend namespace zone. Check the current
   allowance and billing terms before activating it; the setup used two of the
   100 included custom hostnames.
2. Create a dedicated proxied origin hostname pointing to the server, then set it
   as the SaaS fallback origin. Check for an existing fallback before changing it.
3. Give Twenty `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ZONE_ID` and
   `CLOUDFLARE_DCV_DELEGATION_ID`. Forward these variables to server and worker.
   Scope the token to SSL and Certificates Edit on that zone. If restricting its
   client IPs, include the server's actual outbound IPv4 **and IPv6** addresses.
4. Register each custom domain in its workspace's General settings. Add its CNAME
   pointing at the dedicated proxied origin and the DCV delegation CNAME shown by
   Cloudflare. Add an ownership TXT record if Cloudflare requests one.
5. Wait until Cloudflare reports both hostname and SSL status `active`, then reload
   the domain validation in Twenty. Verify that the custom URL opens the correct
   workspace and that Google login returns to that URL.

Use the dedicated origin as the DNS target when the apex hosts another website.
Twenty may suggest a different CNAME target in its domain settings. DNS aliases
alone do not create or isolate workspaces.

## Google, email and optional applications

Register Google web OAuth callbacks on the shared login hostname. Enable Gmail,
Calendar and People APIs, then forward the Google credentials and provider flags
to server and worker. Test login and a workspace account connection separately.
An External/Testing Google project issues Gmail/Calendar refresh tokens that
expire after seven days. Publishing the OAuth app is a project-wide change that
also affects its other clients; do not silently change that setting.

The SMTP sender is configured server-wide with `EMAIL_FROM_ADDRESS` and
`EMAIL_FROM_NAME`. Authenticate that sender's domain with the email provider.
Brevo Free's 300-email daily allowance is shared across senders. CRM contact mail
uses connected mailboxes; invitation and password-reset mail uses the shared SMTP
sender. Distinct system senders per workspace require application changes.

AI providers and Call Recorder are optional and were left unconfigured. Call
Recorder requires an enabled logic-function runtime, Recall.ai credentials and a
signed webhook. Recording, transcription and AI summaries can incur separate
provider charges. Do not enable automatic meeting recording as part of a routine
server restart.

## Backups

Install `restic`, Docker Compose and `flock`. Create a private B2 bucket and a key
limited to that bucket with list/read/write/delete access for restic. Enable
server-side bucket encryption in addition to restic's repository encryption.

1. Install `twenty-crm-backup` in `/usr/local/sbin/` and the service/timer in
   `/etc/systemd/system/`.
2. Create `/etc/twenty-crm-backup/` with mode 0700. Copy `backup.env.example` to
   `backup.env`, fill it privately, and store a random repository password in the
   referenced file. Both files must have mode 0600.
3. Keep an independent copy of the B2 credentials and repository password in
   protected recovery storage. Neither belongs in Git or command output.
4. Initialize the repository once with `restic init` after loading the environment.
   Enable the timer with `systemctl enable --now twenty-crm-backup.timer` and run
   `systemctl start twenty-crm-backup.service` for an initial snapshot.

The script validates a custom-format PostgreSQL dump, backs up uploaded files and
the deployment configuration (including `.env` and its encryption key), retains
30 daily / 8 weekly / 12 monthly snapshots, prunes and checks the repository.
It excludes the live PostgreSQL data directory. The timer runs at 03:45 Toronto
time plus up to ten minutes of jitter and catches up after downtime. Failures
retry after an hour; monitor the service result and backup freshness.

Configure B2 lifecycle rules to remove hidden object versions after 30 days; let
restic manage retention of live repository objects. Uploads are copied live while
`pg_dump` takes a consistent database snapshot. Stop application writes before a
backup intended for a coordinated cutover.

## Restore and upgrades

Restore into an isolated directory and a fresh PostgreSQL database first:

```sh
sudo -i
set -a
. /etc/twenty-crm-backup/backup.env
set +a
restic snapshots --tag twenty-crm
restic restore SNAPSHOT_ID --verify --target /srv/twenty-restored
```

Recover the backed-up Compose files, `.env`, upload volume and database dump.
Use the original image version and encryption key. Change the Compose project
name, host ports and every bind mount to isolated restore locations before
starting services; never attach the restored stack to live volumes.
Start only the fresh database
and Redis, then restore the dump with `pg_restore --no-owner --no-acl
--exit-on-error`. Start server and worker after reviewing external integrations
so the isolated restore does not send mail or sync live accounts.

Before an upgrade, take and verify a backup, review Twenty's release/upgrade
instructions, and test the target version on an isolated restored copy. A database
migration can make an image-only downgrade unsafe; use the matching pre-upgrade
database and files for rollback.

## Verification

- `docker compose config --quiet` and `docker compose ps`.
- HTTPS `/healthz`, Google login and the correct workspace on every domain.
- Upload a workspace logo, reload the page and verify that the image still loads.
- Send an SMTP test to an account you control and confirm actual delivery.
- Check `systemctl show twenty-crm-backup.service -p Result -p ExecMainStatus` and
  `systemctl list-timers twenty-crm-backup.timer`.
- Restore a snapshot and import its dump into a temporary database; validate the
  restored files and configuration as well as the database.

The initial installation passed an isolated dump import and file restore. Repeat
restore verification after material storage, backup or database changes.
