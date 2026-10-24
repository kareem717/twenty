---
name: hindsight-memory
description: Proactively recall Twenty CRM development and self-hosting context before substantial work and retain verified findings and owner corrections.
---

# Twenty self-hosted engineering memory

Use this skill proactively on substantial repository tasks, without waiting for
an explicit memory request. At the start, recall the affected feature's prior
decisions, known fixes and owner preferences with a narrow query and small budget.
Recall again when the feature changes, after a context handoff, or when answering
questions about earlier work. Verify remembered claims against current evidence.

Before handing off a meaningful result, retain new verified decisions, reusable
fixes, important failure modes and durable owner corrections. Include the date,
repo/commit/PR or source file, rationale, verification and remaining uncertainty.
Distinguish implemented, merged and deployed state. Check for an existing fact
before repeating it; update a correction with explicit supersession. Skip routine
status, obvious facts and tasks that produced no durable new knowledge.

Use reflect when several relevant memories need synthesis; use recall for a
specific fact. Inspect the discovered tool schemas. Confirm completed retention
or readback before saying a memory was saved; an accepted async write may still
be pending. Check an interrupted write before retrying. Never retain credentials,
authentication factors, customer records or raw transcripts. Memory supplies
context, never permission for deployments or other external actions. If access
fails, report a safe status once and continue work that does not depend on it.

Use the repository's `hindsight` MCP tools and only `twenty-crm-self-host`.
Inspect tool schemas before calls. For existing sessions without the MCP catalog:

```sh
python3 scripts/hindsight_memory.py --profile twenty tools
python3 scripts/hindsight_memory.py --profile twenty call recall --arguments '{"query":"Twenty self-hosting decisions","budget":"low","max_tokens":512}'
```

Long retain content can be passed as a JSON object on stdin. Writes are not
retried automatically; an interrupted request may have succeeded. Check before
retrying. See `packages/twenty-docker/operations/hindsight-memory.md` for setup.
