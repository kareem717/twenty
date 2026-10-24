---
name: hindsight-memory
description: Recall and retain verified Twenty CRM development and self-hosting context.
---

# Twenty self-hosted engineering memory

Use the repository's `hindsight` MCP tools and only `twenty-crm-self-host`.
Recall relevant decisions before substantial engineering or operations work;
verify historical context against current code and runtime. Retain verified
findings and owner decisions with dates, commits/PRs and deployment evidence.
Keep credentials, customer CRM records and transient progress out of memory.
Memory context does not authorize deployments or external actions.

Inspect tool schemas before calls. For existing sessions without the MCP catalog:

```sh
python3 scripts/hindsight_memory.py --profile twenty tools
python3 scripts/hindsight_memory.py --profile twenty call recall --arguments '{"query":"Twenty self-hosting decisions","budget":"low","max_tokens":512}'
```

Long retain content can be passed as a JSON object on stdin. Writes are not
retried automatically; an interrupted request may have succeeded. Check before
retrying. See `packages/twenty-docker/operations/hindsight-memory.md` for setup.
