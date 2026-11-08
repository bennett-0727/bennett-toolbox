import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const SERVER = path.join(ROOT, "mcp/server.mjs");
const IMAGE_FIXTURE = path.join(ROOT, "tests/fixtures/images/photo.png");

let client;
let transport;
let tempDir;
let database;
let documentPath;
let markitdownPath;

function textOf(result) {
  const content = result?.content?.[0];
  return content?.type === "text" ? content.text : "";
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-mcp-test-"));
  database = path.join(tempDir, "test.db");
  documentPath = path.join(tempDir, "doc.txt");
  fs.writeFileSync(documentPath, "hello\n");
  markitdownPath = path.join(tempDir, "fake-markitdown");
  if (process.platform !== "win32") {
    fs.writeFileSync(markitdownPath, "#!/bin/sh\nprintf '# Converted\\n\\nhello\\n'\n", { mode: 0o755 });
  }

  const db = new DatabaseSync(database);
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
  db.exec("INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Carol'), ('Dave'), ('Eve')");
  db.exec("CREATE TABLE nums (n INTEGER)");
  db.exec("INSERT INTO nums VALUES (9223372036854775807)");
  db.close();

  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry) => entry[1] !== undefined),
  );
  env.BENNETT_MCP_LOG_DIR = path.join(tempDir, "logs");
  if (process.platform !== "win32") env.MARKITDOWN_BIN = markitdownPath;
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env,
    stderr: "pipe",
  });
  client = new Client({ name: "bennett-mcp-test", version: "1.0.0" });
  await client.connect(transport);
});

after(async () => {
  await client?.close();
  await transport?.close();
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

test("列出 MCP tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    [
      "cron_next",
      "encoding_convert",
      "file_search",
      "hash_text",
      "image_convert",
      "image_info",
      "json_format",
      "jwt_decode",
      "markitdown_convert",
      "qr_generate",
      "regex_test",
      "sqlite_query",
      "text_diff",
      "time_convert",
    ],
  );
});

test("JSON 格式化、压缩与错误", async () => {
  const formatted = await client.callTool({
    name: "json_format",
    arguments: { json: '{"b":2,"a":1}', indent: 2 },
  });
  assert.equal(formatted.isError, undefined);
  assert.match(textOf(formatted), /\n  "b": 2/);

  const minified = await client.callTool({
    name: "json_format",
    arguments: { json: '{"b":2,"a":1}', minify: true },
  });
  assert.equal(textOf(minified), '{"b":2,"a":1}');

  const invalid = await client.callTool({
    name: "json_format",
    arguments: { json: "{invalid" },
  });
  assert.equal(invalid.isError, true);
  assert.match(textOf(invalid), /Invalid JSON/);
});

test("SQLite 只读查询、BigInt、截断与写入拒绝", async () => {
  const rows = await client.callTool({
    name: "sqlite_query",
    arguments: { database, sql: "SELECT id, name FROM users ORDER BY id" },
  });
  assert.equal(rows.isError, undefined);
  const parsed = JSON.parse(textOf(rows));
  assert.deepEqual(parsed.columns, ["id", "name"]);
  assert.equal(parsed.rowCount, 5);
  assert.deepEqual(parsed.rows[0], [1, "Alice"]);

  const truncated = await client.callTool({
    name: "sqlite_query",
    arguments: { database, sql: "SELECT * FROM users", limit: 2 },
  });
  const truncatedData = JSON.parse(textOf(truncated));
  assert.equal(truncatedData.rowCount, 2);
  assert.equal(truncatedData.truncated, true);

  const bigint = await client.callTool({
    name: "sqlite_query",
    arguments: { database, sql: "SELECT n FROM nums" },
  });
  assert.deepEqual(JSON.parse(textOf(bigint)).rows[0], ["9223372036854775807"]);

  const write = await client.callTool({
    name: "sqlite_query",
    arguments: { database, sql: "DELETE FROM users" },
  });
  assert.equal(write.isError, true);
  assert.match(textOf(write), /read-only/i);

  const pragmaWrite = await client.callTool({
    name: "sqlite_query",
    arguments: { database, sql: "PRAGMA journal_mode = WAL" },
  });
  assert.equal(pragmaWrite.isError, true);
});

test("MarkItDown 转换", { skip: process.platform === "win32" }, async () => {
  const result = await client.callTool({
    name: "markitdown_convert",
    arguments: { path: documentPath },
  });
  assert.equal(result.isError, undefined);
  assert.match(textOf(result), /# Converted/);
});

test("文件搜索、时区、Cron 与二维码", async () => {
  const searchDir = path.join(tempDir, "search");
  fs.mkdirSync(path.join(searchDir, "sub", "deep"), { recursive: true });
  fs.writeFileSync(path.join(searchDir, "alpha.txt"), "a");
  fs.writeFileSync(path.join(searchDir, "sub", "beta.txt"), "bb");
  fs.writeFileSync(path.join(searchDir, "sub", "deep", "alpha.log"), "ccc");
  const search = await client.callTool({
    name: "file_search",
    arguments: { directory: searchDir, query: "alpha" },
  });
  const searchData = JSON.parse(textOf(search));
  assert.deepEqual(searchData.results.map((result) => result.name).sort(), ["alpha.log", "alpha.txt"]);
  assert.equal(searchData.truncated, false);

  const limited = await client.callTool({
    name: "file_search",
    arguments: { directory: searchDir, query: "a", limit: 1 },
  });
  const limitedData = JSON.parse(textOf(limited));
  assert.equal(limitedData.results.length, 1);
  assert.equal(limitedData.truncated, true);

  const time = await client.callTool({
    name: "time_convert",
    arguments: { value: 0, from_timezone: "UTC", to_timezone: "Asia/Shanghai" },
  });
  const timeData = JSON.parse(textOf(time));
  assert.equal(timeData.epochMillis, 0);
  assert.match(timeData.formatted, /1970-01-01 08:00:00/);

  const cron = await client.callTool({
    name: "cron_next",
    arguments: { expression: "*/5 * * * *", timezone: "UTC", count: 3 },
  });
  const cronData = JSON.parse(textOf(cron));
  assert.equal(cronData.runs.length, 3);
  assert.ok(cronData.runs.every((run) => run.iso));

  const svg = await client.callTool({
    name: "qr_generate",
    arguments: { text: "hello mcp", format: "svg", size: 160 },
  });
  assert.match(textOf(svg), /<svg/);

  const png = await client.callTool({
    name: "qr_generate",
    arguments: { text: "hello mcp", format: "png", size: 160 },
  });
  assert.equal(png.content[0].type, "image");
  assert.equal(png.content[0].mimeType, "image/png");
  assert.ok(png.content[0].data.length > 100);
});

test("编码、哈希与 JWT", async () => {
  const encoded = await client.callTool({
    name: "encoding_convert",
    arguments: { text: "hello 世界", operation: "base64_encode" },
  });
  const decoded = await client.callTool({
    name: "encoding_convert",
    arguments: { text: textOf(encoded), operation: "base64_decode" },
  });
  assert.equal(textOf(decoded), "hello 世界");

  const hex = await client.callTool({
    name: "encoding_convert",
    arguments: { text: "abc", operation: "hex_encode" },
  });
  assert.equal(textOf(hex), "616263");

  const hash = await client.callTool({
    name: "hash_text",
    arguments: { text: "hello", algorithm: "sha256" },
  });
  assert.equal(
    JSON.parse(textOf(hash)).digest,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "123", name: "Alice" })).toString("base64url");
  const signature = createHmac("sha256", "secret").update(`${header}.${payload}`).digest("base64url");
  const jwt = `${header}.${payload}.${signature}`;
  const decodedJwt = await client.callTool({
    name: "jwt_decode",
    arguments: { token: jwt, secret: "secret" },
  });
  const jwtData = JSON.parse(textOf(decodedJwt));
  assert.equal(jwtData.signatureValid, true);
  assert.equal(jwtData.payload.name, "Alice");
  const badJwt = await client.callTool({
    name: "jwt_decode",
    arguments: { token: jwt, secret: "wrong" },
  });
  assert.equal(JSON.parse(textOf(badJwt)).signatureValid, false);
});

test("正则与文本 Diff", async () => {
  const regex = await client.callTool({
    name: "regex_test",
    arguments: {
      pattern: "(?<word>\\w+)",
      flags: "g",
      text: "hello world",
      replacement: "$<word>!",
    },
  });
  const regexData = JSON.parse(textOf(regex));
  assert.equal(regexData.matches.length, 2);
  assert.deepEqual(regexData.matches[0].groups, ["hello"]);
  assert.equal(regexData.replaced, "hello! world!");

  const diff = await client.callTool({
    name: "text_diff",
    arguments: { old_text: "a\nb", new_text: "a\nc" },
  });
  const diffData = JSON.parse(textOf(diff));
  assert.equal(diffData.added, 1);
  assert.equal(diffData.removed, 1);
  assert.match(diffData.diff, /-b/);
  assert.match(diffData.diff, /\+c/);
});

test("图片信息与转换", async () => {
  const info = await client.callTool({
    name: "image_info",
    arguments: { path: IMAGE_FIXTURE },
  });
  const infoData = JSON.parse(textOf(info));
  assert.equal(infoData.format, "png");
  assert.ok(infoData.width > 0 && infoData.height > 0);

  const converted = await client.callTool({
    name: "image_convert",
    arguments: { path: IMAGE_FIXTURE, format: "webp", width: 80 },
  });
  assert.equal(converted.content[0].type, "image");
  assert.equal(converted.content[0].mimeType, "image/webp");
  const meta = JSON.parse(textOf({ content: [converted.content[1]] }));
  assert.equal(meta.format, "webp");
  assert.ok(meta.width <= 80);
  assert.ok(converted.content[0].data.length > 100);
});

test("操作日志与敏感字段脱敏", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const logPath = path.join(tempDir, "logs", "mcp.log");
  assert.ok(fs.existsSync(logPath), "log file missing");
  const log = fs.readFileSync(logPath, "utf8");
  assert.match(log, /"event":"startup"/);
  assert.match(log, /"tool":"json_format"/);
  assert.match(log, /"tool":"jwt_decode"/);
  assert.match(log, /"success":false/);
  assert.match(log, /"durationMs":\d+/);
  assert.match(log, /"secret":"\[REDACTED\]"/);
  assert.match(log, /"token":"\[REDACTED\]"/);
  assert.ok(!log.includes('"secret":"secret"'));
  assert.ok(!log.includes('"token":"ey'));
  assert.ok(!log.includes('"key":"'));
});
