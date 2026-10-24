#!/bin/sh
set -eu
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ "$#" -eq 0 ]; then
    set -- python3 "$repo_root/scripts/hindsight_memory.py" --profile twenty serve
fi
environment_id=${TWENTY_OP_ENVIRONMENT_ID:-}
if [ -z "$environment_id" ] && [ -f "$repo_root/config/hindsight.op.environment" ]; then
    IFS= read -r environment_id < "$repo_root/config/hindsight.op.environment"
fi
if [ -z "$environment_id" ]; then
    exec "$@"
fi
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] &&
   [ -x "$HOME/.local/bin/repo-1password" ]; then
    exec "$HOME/.local/bin/repo-1password" twenty --environment="$environment_id" -- "$@"
fi
unset HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY
exec op run --environment="$environment_id" -- sh -c '
    unset OP_SERVICE_ACCOUNT_TOKEN
    if [ -z "${HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY:-}" ]; then
        echo "Missing required 1Password binding: HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY" >&2
        exit 1
    fi
    exec "$@"
' sh "$@"
