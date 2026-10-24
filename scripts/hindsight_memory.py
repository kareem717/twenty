#!/usr/bin/env python3
"""Repo-scoped Hindsight MCP client and stdio bridge; Python standard library only."""
import argparse
import copy
import json
import os
from pathlib import Path
import re
import stat
import sys
import urllib.error
import urllib.request

VERSION = "2025-03-26"
TOOLS = {"recall", "reflect", "retain", "sync_retain", "list_memories",
         "list_documents", "list_mental_models", "list_directives", "list_tags"}
KEY_ENV = {"twenty": "HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY"}


class MemoryError(Exception):
    """A safe-to-display error without credential or response contents."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self, profile):
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", profile):
            raise MemoryError("Invalid profile name")
        base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
        path = base / "hermes-memory" / (profile + ".json")
        token = os.environ.get(KEY_ENV.get(profile, ""))
        try:
            if token is not None:
                if not token or token != token.strip() or any(ch.isspace() for ch in token):
                    raise MemoryError("Invalid Hindsight environment credential")
                if token.startswith("op://"):
                    raise MemoryError("Unresolved 1Password reference; launch with scripts/hindsight-with-1password.sh")
                metadata = Path(__file__).resolve().parent.parent / "config" / ("hindsight." + profile + ".json")
                self.config = json.loads(metadata.read_text())
                self.config["token"] = token
            else:
                with path.open() as stream:
                    info = os.fstat(stream.fileno())
                    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
                        raise MemoryError("Profile must be owned by this user with mode 0600")
                    self.config = json.load(stream)
        except (OSError, ValueError):
            raise MemoryError("Missing/invalid repo metadata or private profile") from None
        self.banks = sorted(self.config["grants"])
        self.default = self.config["default_bank"]
        if self.config["origin"] != "https://memory.fundlevel.co" or self.default not in self.banks:
            raise MemoryError("Invalid origin or default bank")
        if not all(re.fullmatch(r"[a-z0-9][a-z0-9_-]*", bank) for bank in self.banks):
            raise MemoryError("Invalid bank ID")
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, bank, method, params=None):
        if bank not in self.banks:
            raise MemoryError("Bank is outside this repo's grants")
        payload = {"jsonrpc": "2.0", "id": 1, "method": method}
        if params is not None:
            payload["params"] = params
        request = urllib.request.Request(
            self.config["origin"] + "/mcp/" + bank + "/",
            data=json.dumps(payload).encode(),
            headers={"Authorization": "Bearer " + self.config["token"],
                     "Content-Type": "application/json",
                     "Accept": "application/json, text/event-stream",
                     "MCP-Protocol-Version": VERSION,
                     "User-Agent": "hermes-memory/1.0"})
        try:
            with self.opener.open(request, timeout=120) as response:
                raw = response.read(4 * 1024 * 1024 + 1)
                if len(raw) > 4 * 1024 * 1024:
                    raise MemoryError("Memory response exceeded size limit")
                data = json.loads(raw)
        except urllib.error.HTTPError as error:
            raise MemoryError("Memory gateway HTTP " + str(error.code)) from None
        except (OSError, ValueError):
            raise MemoryError("Memory transport failed; write outcome may be unknown; do not retry blindly") from None
        if "error" in data:
            raise MemoryError("Memory gateway rejected the MCP request")
        return data["result"]

    def tools(self):
        result = self.request(self.default, "tools/list")
        tools = []
        for original in result["tools"]:
            if original["name"] not in TOOLS:
                continue
            tool = copy.deepcopy(original)
            schema = tool["inputSchema"]
            if tool["name"] in {"retain", "sync_retain"}:
                for blocked in ("document_id", "document_ids", "strategy", "update_mode"):
                    schema.get("properties", {}).pop(blocked, None)
            schema.setdefault("properties", {})["bank"] = {
                "type": "string", "enum": self.banks, "default": self.default,
                "description": "Memory bank; defaults to " + self.default}
            tool["description"] = tool.get("description", "") + " Default bank: " + self.default + "."
            tools.append(tool)
        tools.append({"name": "list_banks", "description": "List this repo's authorized banks and default.",
                      "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}})
        return {"tools": tools}

    def call(self, name, arguments, bank=None):
        arguments = dict(arguments)
        selected = arguments.pop("bank", bank or self.default)
        if name == "list_banks":
            return {"content": [{"type": "text", "text": json.dumps({
                "default_bank": self.default, "grants": self.config["grants"]})}]}
        if name not in TOOLS:
            raise MemoryError("Unknown memory tool")
        return self.request(selected, "tools/call", {"name": name, "arguments": arguments})


def serve(client):
    """Newline-delimited MCP stdio. Never log request arguments or credentials."""
    for line in sys.stdin:
        message = None
        try:
            message = json.loads(line)
            if not isinstance(message, dict):
                raise ValueError()
            if "id" not in message:
                continue
            method = message.get("method")
            if method == "initialize":
                result = {"protocolVersion": VERSION, "capabilities": {"tools": {"listChanged": False}},
                          "serverInfo": {"name": "hermes-memory", "version": "1.0.0"},
                          "instructions": "Use " + client.default + " for repo memories; list_banks shows other grants."}
            elif method == "ping":
                result = {}
            elif method == "tools/list":
                result = client.tools()
            elif method == "tools/call":
                params = message["params"]
                try:
                    result = client.call(params["name"], params.get("arguments", {}))
                except MemoryError as error:
                    result = {"isError": True, "content": [{"type": "text", "text": str(error)}]}
            else:
                print(json.dumps({"jsonrpc": "2.0", "id": message["id"],
                                  "error": {"code": -32601, "message": "Method not found"}}), flush=True)
                continue
            output = {"jsonrpc": "2.0", "id": message["id"], "result": result}
        except (ValueError, KeyError, TypeError, MemoryError) as error:
            output = {"jsonrpc": "2.0", "id": message.get("id") if isinstance(message, dict) else None,
                      "error": {"code": -32603 if isinstance(error, MemoryError) else -32602,
                                "message": str(error) if isinstance(error, MemoryError) else "Invalid request"}}
        print(json.dumps(output), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("serve")
    sub.add_parser("banks")
    sub.add_parser("tools")
    call = sub.add_parser("call")
    call.add_argument("tool", choices=sorted(TOOLS | {"list_banks"}))
    call.add_argument("--bank")
    call.add_argument("--arguments", default="-", help="JSON object, or - to read stdin")
    args = parser.parse_args()
    try:
        client = Client(args.profile)
        if args.action == "serve":
            serve(client)
            return
        if args.action == "banks":
            result = {"default_bank": client.default, "grants": client.config["grants"]}
        elif args.action == "tools":
            result = client.tools()
        else:
            arguments = json.load(sys.stdin) if args.arguments == "-" else json.loads(args.arguments)
            if not isinstance(arguments, dict):
                raise MemoryError("Tool arguments must be a JSON object")
            result = client.call(args.tool, arguments, args.bank)
        print(json.dumps(result, indent=2))
        if isinstance(result, dict) and result.get("isError"):
            return 1
    except (MemoryError, KeyError, ValueError, TypeError) as error:
        print(str(error) if isinstance(error, MemoryError) else "Invalid memory configuration/arguments", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
