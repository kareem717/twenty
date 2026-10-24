# Twenty CRM engineering memory

Coding agents in `kareem717/twenty` use the dedicated `twenty-crm-self-host`
Hindsight bank. Its separate gateway credential permits recall, reflect, retain,
sync retain and listing tools for this bank only. Bank administration, deletion
and destructive document updates are excluded. Memory holds verified engineering
and self-hosting context, not credentials or customer CRM records.

## Agent connection

The root `.mcp.json` adds `hindsight` alongside the existing servers. Codex uses
`.codex/config.toml`; trust this project and reconnect MCP after changing it.
Both launch `sh scripts/hindsight-with-1password.sh`. The standard-library Python
bridge resolves the named variable `HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY`, strips
client-local progress metadata, refuses redirects and never retries writes.
The only permitted bank is tracked in `config/hindsight.twenty.json`.

For an already-running session without the new MCP catalog:

```sh
python3 scripts/hindsight_memory.py --profile twenty tools
python3 scripts/hindsight_memory.py --profile twenty call recall \
  --arguments '{"query":"Twenty self-hosting decisions","budget":"low","max_tokens":512}'
```

Use the [memory skill](../../../.agents/skills/hindsight-memory/SKILL.md) to recall
before substantial work and retain dated, verified findings. Send long retain
arguments as JSON on stdin. If a write is interrupted, inspect the bank before
retrying; its outcome may be unknown.

## Credentials and 1Password

On `t3-worker-2`, an owned mode-0600 private bootstrap profile at
`~/.config/hermes-memory/twenty.json` supplies the new scoped key. Git does not
carry that profile or any secret value. The client uses the named process
variable first when present; a malformed or unresolved value fails explicitly.
Until an Environment ID is selected, the wrapper uses this bootstrap or an
explicitly supplied process variable.

The preferred source is a separate **Twenty CRM Self Host** 1Password Environment
containing `HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY`. A private import file is staged
on the owner's MacBook at `~/Downloads/1Password Imports/twenty-crm-self-host.env`.
Import and worker read authorization remain pending. The thread's browser tools
returned `Authentication required`; no runtime identity or Environment grant has
been created for Twenty yet. Hermes and Scheduler Zero identities are not reused.

After desktop import, track the non-secret Environment ID in
`config/hindsight.op.environment` or set `TWENTY_OP_ENVIRONMENT_ID`. Provision a
separate worker service account with read access to only that Environment and
store its token with the worker's host-encrypted credential mechanism. The
launcher uses `repo-1password twenty` on enrolled workers, or the caller's own
authenticated `op` CLI/service-account environment on other machines. Selecting
an ID requires successful 1Password loading; missing variables fail before any
private-file fallback. Exact-value readback must precede retiring the bootstrap
or deleting the temporary MacBook import file.

```sh
TWENTY_OP_ENVIRONMENT_ID='<environment-id>' ./scripts/hindsight-with-1password.sh codex
```

## Verification and recovery

On 2026-10-24, the live bank and public gateway route were created, a separate
Twenty-only key was issued, and cross-bank probes to `hermes-dev` and
`scheduler-zero-cto` returned HTTP 403. The existing Hermes all-bank key was
explicitly extended to this bank without changing its secret. The Hindsight API
container was neither replaced nor restarted; only the scoped gateway was
restarted and Caddy's validated route configuration reloaded. No Twenty
application or deployment configuration was changed.

Private operation evidence is retained on Claudy under
`/mnt/storage/hindsight-twenty-access-20261024`. The Hermes repository access
runbook records the operator-side changes and checks. Revoke only this repo's
key if compromised, issue a replacement with the same single-bank grant, and
replace its private credential source. Do not delete a populated bank to undo
client configuration. Reconnect agent sessions after rotating credentials.

Local boundary and launcher tests:

```sh
python3 -m unittest discover -s scripts -p test_hindsight_memory.py
```
