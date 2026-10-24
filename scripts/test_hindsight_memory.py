"""Boundary tests for the repository MCP bridge, without network or real keys."""
import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
from unittest.mock import patch

from hindsight_memory import Client, MemoryError, NoRedirect, serve


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = patch.dict(os.environ, {"XDG_CONFIG_HOME": self.temp.name})
        self.env.start()
        self.addCleanup(self.env.stop)
        folder = Path(self.temp.name) / "hermes-memory"
        folder.mkdir()
        self.path = folder / "test.json"
        self.path.write_text(json.dumps({"token": "synthetic-secret", "origin": "https://memory.fundlevel.co",
                                         "default_bank": "twenty-crm-self-host", "grants": {"twenty-crm-self-host": "write"}}))
        self.path.chmod(0o600)

    def test_private_profile_required(self):
        self.path.chmod(0o644)
        with self.assertRaises(MemoryError):
            Client("test")

    def test_bank_denied_before_network(self):
        client = Client("test")
        with patch.object(client.opener, "open") as network:
            with self.assertRaises(MemoryError):
                client.call("recall", {"bank": "other", "query": "example"})
            network.assert_not_called()

    def test_stdio_strips_client_metadata_and_bank(self):
        client = Client("test")
        messages = [
            {"id": 1, "method": "initialize", "params": {"protocolVersion": "2025-11-25"}},
            {"method": "notifications/initialized"},
            {"id": 2, "method": "tools/list", "params": {"_meta": {"progressToken": 7}}},
            {"id": 3, "method": "tools/call", "params": {"name": "retain", "arguments": {"content": "fixture", "bank": "twenty-crm-self-host"}, "_meta": {"progressToken": 8}}}
        ]
        def upstream(bank, method, params=None):
            if method == "tools/list":
                return {"tools": [{"name": "retain", "inputSchema": {"type": "object", "properties": {"content": {"type": "string"}, "document_id": {}}, "required": ["content"]}}]}
            return {"content": [{"type": "text", "text": "accepted"}]}
        output = io.StringIO()
        with patch.object(client, "request", side_effect=upstream) as request, patch("sys.stdin", io.StringIO("\n".join(map(json.dumps, messages)))), contextlib.redirect_stdout(output):
            serve(client)
        responses = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([row["id"] for row in responses], [1, 2, 3])
        self.assertEqual(responses[0]["result"]["protocolVersion"], "2025-03-26")
        props = responses[1]["result"]["tools"][0]["inputSchema"]["properties"]
        self.assertEqual(props["bank"]["default"], "twenty-crm-self-host")
        self.assertNotIn("document_id", props)
        request.assert_any_call("twenty-crm-self-host", "tools/call", {"name": "retain", "arguments": {"content": "fixture"}})
        self.assertNotIn("synthetic-secret", output.getvalue())

    def test_no_redirect_or_write_retry(self):
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.invalid"))
        client = Client("test")
        with patch.object(client.opener, "open", side_effect=OSError("synthetic-secret")) as network:
            with self.assertRaises(MemoryError) as caught:
                client.call("retain", {"content": "fixture"})
            self.assertNotIn("synthetic-secret", str(caught.exception))
            self.assertEqual(network.call_count, 1)

    def test_env_credential_works_without_a_private_profile(self):
        with patch.dict(os.environ, {"HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY": "synthetic-env-key"}):
            client = Client("twenty")
        self.assertEqual(client.config["token"], "synthetic-env-key")
        self.assertEqual(client.default, "twenty-crm-self-host")
        self.assertEqual(client.banks, ["twenty-crm-self-host"])
        self.assertFalse((Path(self.temp.name) / "hermes-memory/twenty.json").exists())

    def test_unresolved_or_invalid_env_does_not_fall_back(self):
        for value in ("op://Twenty CRM Self Host/Hindsight/api_key", "", " synthetic-key"):
            with patch.dict(os.environ, {"HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY": value}):
                with self.assertRaises(MemoryError) as caught:
                    Client("twenty")
                self.assertNotIn("synthetic-key", str(caught.exception))

    def test_onepassword_launcher_passes_environment_without_shell_expansion(self):
        directory = Path(self.temp.name)
        fake_op = directory / "op"
        fake_op.write_text("""#!/usr/bin/env python3
import os, sys
assert sys.argv[1] == 'run'
if os.environ.get('EXPECTED_ENVIRONMENT_ID'):
 assert sys.argv[2] == '--environment='+os.environ['EXPECTED_ENVIRONMENT_ID']
else:
 assert sys.argv[2].endswith('/config/hindsight.op.env')
assert sys.argv[3] == '--'
if not os.environ.get('OMIT_KEY'):
 os.environ['HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY'] = 'synthetic-env-key'
os.execvp(sys.argv[4], sys.argv[4:])
""")
        fake_op.chmod(0o755)
        root = Path(__file__).resolve().parent.parent
        launch_root = directory / "checkout with spaces"
        (launch_root / "scripts").mkdir(parents=True)
        (launch_root / "config").mkdir()
        launcher = launch_root / "scripts/hindsight-with-1password.sh"
        launcher.write_text((root / "scripts/hindsight-with-1password.sh").read_text())
        launcher.chmod(0o755)
        configured_id = launch_root / "config/hindsight.op.environment"
        child = "import sys;sys.path.insert(0,sys.argv[1]);from hindsight_memory import Client;assert Client('twenty').config['token']=='synthetic-env-key';assert sys.argv[2]=='literal $() argument'"
        for saved_id, environment_id in (("synthetic-config-id", None),
                                         ("synthetic-config-id", "synthetic-override-id")):
            if saved_id:
                configured_id.write_text(saved_id + "\n")
            else:
                configured_id.unlink(missing_ok=True)
            env = {**os.environ, "HOME": str(directory), "PATH": str(directory) + os.pathsep + os.environ["PATH"]}
            env.pop("TWENTY_OP_ENVIRONMENT_ID", None)
            env.pop("EXPECTED_ENVIRONMENT_ID", None)
            if saved_id or environment_id:
                env["EXPECTED_ENVIRONMENT_ID"] = environment_id or saved_id
            if environment_id:
                env["TWENTY_OP_ENVIRONMENT_ID"] = environment_id
            result = subprocess.run(
                [str(launcher), sys.executable, "-c", child,
                 str(root / "scripts"), "literal $() argument"],
                env=env, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, "")

        # A missing imported key must fail even if the parent has a bootstrap key.
        env["OMIT_KEY"] = "1"
        env["HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY"] = "inherited-bootstrap-secret"
        result = subprocess.run([str(launcher), "true"], env=env,
                                capture_output=True, text=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing required 1Password binding", result.stderr)
        self.assertNotIn("inherited-bootstrap-secret", result.stderr)

        # The optional worker helper receives the selected ID and literal args.
        helper = directory / ".local/bin/repo-1password"
        helper.parent.mkdir(parents=True)
        helper.write_text("""#!/usr/bin/env python3
import os,sys
assert sys.argv[1:4] == ['twenty', '--environment=synthetic-override-id', '--']
os.environ.pop('OMIT_KEY',None)
os.environ['HINDSIGHT_TWENTY_CRM_SELF_HOST_API_KEY']='synthetic-env-key'
os.execvp(sys.argv[4],sys.argv[4:])
""")
        helper.chmod(0o700)
        result = subprocess.run([str(launcher), sys.executable, "-c", child,
                                 str(root / "scripts"), "literal $() argument"],
                                env=env, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
