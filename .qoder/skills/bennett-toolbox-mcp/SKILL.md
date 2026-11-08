---
name: bennett-toolbox-mcp
description: Use the local Bennett Toolbox MCP server for JSON formatting, read-only SQLite queries, MarkItDown conversion, file search, time/Cron, QR codes, encoding/hash/JWT, regex/diff, and image inspection/conversion. Trigger when the user asks for these operations and the bennett-toolbox MCP tools are available; also use when an MCP tool fails or returns unexpected results.
---

# Bennett Toolbox MCP

Bennett Toolbox exposes 14 local MCP tools. Use them instead of ad-hoc shell scripts when the MCP server is connected. Full schemas, examples, and installation instructions are in `docs/mcp.md`; tool descriptions are the source of truth.

## First check

1. Confirm the `bennett-toolbox` MCP server is connected and its tools are listed.
2. If it is missing, tell the user to reload/restart the MCP client using the config in `docs/mcp.md`. Do not claim a tool ran if it is unavailable.
3. If a tool schema differs from this skill, trust the live schema returned by the client.

## Tool map

| Task | Tool |
| --- | --- |
| Format/minify JSON | `json_format` |
| Read-only SQLite | `sqlite_query` |
| Document to Markdown | `markitdown_convert` |
| Find files by name | `file_search` |
| Timestamp/timezone | `time_convert` |
| Next cron runs | `cron_next` |
| QR code | `qr_generate` |
| Base64/URL/Hex | `encoding_convert` |
| Hashes/HMAC | `hash_text` |
| JWT decode/verify | `jwt_decode` |
| Regex test/replace | `regex_test` |
| Text diff | `text_diff` |
| Image metadata | `image_info` |
| Image convert/resize | `image_convert` |

## Operating rules

- Prefer absolute paths. The tools read local files and return content to the AI client.
- `sqlite_query` is **read-only**: one statement, no INSERT/UPDATE/DELETE/DDL or PRAGMA assignments; default limit 200, max 1000. Never try to bypass this with SQL tricks.
- Use `sqlite_query` for schema inspection:
  1. `SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name`
  2. `PRAGMA table_info("table_name")`
  3. Then query data with a `LIMIT`.
- Do not send secrets to tools unless the task needs them. Logs redact `secret/key/token/password`, but paths and SQL/text previews are logged.
- Images and QR PNG are returned as MCP image content, not written to disk. If the user wants a file, explain that the client must save it.
- `image_convert` requires sharp. The ZIP distribution installs it; the standalone `.mjs` only works for non-image tools unless sharp is available.
- `markitdown_convert` uses `MARKITDOWN_BIN`, `BENNETT_MARKITDOWN_COMPONENT_DIR`, or the installed component. If it reports missing, ask the user to install the component or set `MARKITDOWN_BIN`.
- Avoid catastrophic regex patterns; `regex_test` caps matches but cannot cancel arbitrary backtracking.

## Common workflows

### Inspect a SQLite database
1. List tables/views with `sqlite_query`.
2. Inspect columns with `PRAGMA table_info`.
3. Run a bounded query, e.g. `SELECT * FROM "users" LIMIT 20`.
4. Report `truncated: true` honestly and raise the limit only when needed.

### Convert a document
1. Confirm the file path exists.
2. Call `markitdown_convert` with a timeout when needed.
3. If MarkItDown is missing, stop and report the component/env fix.

### Transform JSON
Call `json_format`; use `minify: true` only when the user asks for compact output. Never hand-edit the returned JSON unless asked.

### Time and Cron
Use `time_convert` for epoch/ISO conversions and `cron_next` for schedule previews. State the timezone explicitly in the answer.

### Security-sensitive text
Use `hash_text`, `jwt_decode`, `encoding_convert`. For JWT verification, never echo the secret or full token in the final answer.

### Images and QR
Use `image_info` before converting. Use `image_convert` for format/quality/resize; report MIME, dimensions, and that the result is image content, not a saved file.

## Troubleshooting

- Tool missing: reload the MCP client; verify the server command uses Node 24+ and the correct `mcp/server.mjs` path.
- SQLite error: check the file path/format; writes are intentionally rejected.
- `node:sqlite` error: use Node 26/24 absolute path.
- MarkItDown error: install the component or set `MARKITDOWN_BIN`.
- Image error: install sharp (`npm install` in the ZIP distribution).
- Logs: `~/Library/Logs/bennett-toolbox/mcp.log` (macOS), `%LOCALAPPDATA%\bennett-toolbox\logs\mcp.log` (Windows), `~/.local/state/bennett-toolbox/mcp.log` (Linux). Search `"success":false`; `BENNETT_MCP_LOG_DIR` overrides.

Do not reimplement MCP behavior with shell commands when a connected tool exists. If MCP is unavailable, say so before using a fallback.
