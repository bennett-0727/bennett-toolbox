import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CronExpressionParser } from "cron-parser";
import { DateTime, IANAZone } from "luxon";
import QRCode from "qrcode";
import { createTwoFilesPatch, diffLines } from "diff";

const execFileAsync = promisify(execFile);
const SERVER_NAME = "bennett-toolbox";
const SERVER_VERSION = "0.1.0";

let sharpLoader = null;
function loadSharp() {
  if (!sharpLoader) {
    sharpLoader = import("sharp").then((module) => module.default);
  }
  return sharpLoader;
}

const LOG_MAX_BYTES = 5 * 1024 * 1024;

function logDirectory() {
  if (process.env.BENNETT_MCP_LOG_DIR) return path.resolve(process.env.BENNETT_MCP_LOG_DIR);
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "bennett-toolbox", "logs");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Logs", "bennett-toolbox");
  }
  return path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state"), "bennett-toolbox");
}

const LOG_FILE = path.join(logDirectory(), "mcp.log");
let logQueue = Promise.resolve();

async function rotateLogIfNeeded() {
  try {
    const stat = await fs.promises.stat(LOG_FILE);
    if (stat.size < LOG_MAX_BYTES) return;
    const previous = `${LOG_FILE}.1`;
    await fs.promises.rm(previous, { force: true });
    await fs.promises.rename(LOG_FILE, previous);
  } catch {}
}

function writeLog(event) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`;
  logQueue = logQueue
    .then(async () => {
      await fs.promises.mkdir(path.dirname(LOG_FILE), { recursive: true });
      await rotateLogIfNeeded();
      await fs.promises.appendFile(LOG_FILE, line, "utf8");
    })
    .catch(() => {});
  return logQueue;
}

const SENSITIVE_KEY = /secret|key|token|password|authorization/i;
const PREVIEW_KEYS = new Set(["text", "sql", "json", "old_text", "new_text", "replacement"]);

function sanitizeValue(value, key = "", depth = 0) {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 4) return "[depth-limit]";
  if (typeof value === "string") {
    if (PREVIEW_KEYS.has(key.toLowerCase())) {
      return value.length > 300 ? `${value.slice(0, 300)}… (${value.length} chars)` : value;
    }
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, key, depth + 1));
  if (value && typeof value === "object") {
    const entries = Object.entries(value).slice(0, 30);
    return Object.fromEntries(entries.map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey, depth + 1)]));
  }
  return value;
}

function resultSummary(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  return {
    isError: Boolean(result?.isError),
    content: content.map((item) =>
      item?.type === "image"
        ? { type: "image", mimeType: item.mimeType, base64Length: item.data?.length ?? 0 }
        : { type: item?.type || "unknown", textLength: item?.text?.length ?? 0 },
    ),
  };
}

function errorText(result) {
  const item = Array.isArray(result?.content) ? result.content.find((entry) => entry?.type === "text") : null;
  const text = item?.text || "Tool returned an error";
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

function errorResult(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function splitStatements(sql) {
  const parts = [];
  let start = 0;
  let index = 0;
  while (index < sql.length) {
    const char = sql[index];
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (char === "[") {
      index += 1;
      while (index < sql.length && sql[index] !== "]") index += 1;
      index += 1;
      continue;
    }
    if (char === "-" && sql[index + 1] === "-") {
      index += 2;
      while (index < sql.length && sql[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && sql[index + 1] === "*") {
      index += 2;
      while (index < sql.length && !(sql[index] === "*" && sql[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }
    if (char === ";") {
      const part = sql.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
    index += 1;
  }
  const tail = sql.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

function serializeValue(value) {
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (value instanceof Uint8Array) return `<BLOB ${value.byteLength} B>`;
  if (value === null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

function componentRoots() {
  const home = os.homedir();
  const roots = [];
  if (process.platform === "win32") {
    roots.push(path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "bennett-toolbox"));
  } else if (process.platform === "darwin") {
    roots.push(path.join(home, "Library", "Application Support", "bennett-toolbox"));
  } else {
    roots.push(path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "bennett-toolbox"));
  }
  return roots;
}

function findMarkitdown() {
  if (process.env.MARKITDOWN_BIN && fs.existsSync(process.env.MARKITDOWN_BIN)) {
    return process.env.MARKITDOWN_BIN;
  }
  const binary = process.platform === "win32" ? "markitdown.exe" : "markitdown";
  const candidates = [];
  if (process.env.BENNETT_MARKITDOWN_COMPONENT_DIR) {
    candidates.push(path.join(process.env.BENNETT_MARKITDOWN_COMPONENT_DIR, binary));
  }
  for (const root of componentRoots()) {
    const components = path.join(root, "components", "markitdown");
    let versions = [];
    try {
      versions = fs.readdirSync(components, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
          const dir = path.join(components, entry.name);
          let mtime = 0;
          try {
            mtime = fs.statSync(dir).mtimeMs;
          } catch {}
          return { dir, mtime };
        })
        .sort((left, right) => right.mtime - left.mtime);
    } catch {}
    for (const version of versions) {
      candidates.push(path.join(version.dir, binary));
    }
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    instructions:
      "Local Bennett Toolbox tools. sqlite_query is read-only and markitdown_convert reads local files; prefer explicit paths.",
  },
);

const serverRegisterTool = server.registerTool.bind(server);

function registerTool(name, config, handler) {
  return serverRegisterTool(name, config, async (args, extra) => {
    const started = Date.now();
    try {
      const result = await handler(args, extra);
      const isError = Boolean(result?.isError);
      const durationMs = Date.now() - started;
      await writeLog({
        event: "tool",
        tool: name,
        requestId: extra?.requestId,
        args: sanitizeValue(args),
        durationMs,
        success: !isError,
        error: isError ? errorText(result) : undefined,
        result: resultSummary(result),
      });
      console.error(`[mcp] tool=${name} duration=${durationMs}ms ok=${!isError}`);
      return result;
    } catch (error) {
      const durationMs = Date.now() - started;
      const message = error instanceof Error ? error.message : String(error);
      await writeLog({
        event: "tool",
        tool: name,
        requestId: extra?.requestId,
        args: sanitizeValue(args),
        durationMs,
        success: false,
        error: error instanceof Error ? error.stack || message : message,
      });
      console.error(`[mcp] tool=${name} duration=${durationMs}ms ok=false error=${message}`);
      return errorResult(`Tool ${name} failed: ${message}`);
    }
  });
}

registerTool(
  "json_format",
  {
    title: "Format or minify JSON",
    description:
      "Validate a JSON string and return formatted JSON. Set minify=true to remove whitespace; indent controls spaces (0-8).",
    inputSchema: z.object({
      json: z.string().describe("JSON text to format or minify"),
      indent: z.number().int().min(0).max(8).optional().default(2),
      minify: z.boolean().optional().default(false),
    }),
  },
  async ({ json, indent, minify }) => {
    try {
      const parsed = JSON.parse(json);
      return textResult(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent));
    } catch (error) {
      return errorResult(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "sqlite_query",
  {
    title: "Query SQLite (read-only)",
    description:
      "Run one read-only SQLite statement (SELECT, WITH, PRAGMA, or EXPLAIN) against a local database. Write statements are rejected. Returns JSON with columns, rows, and truncated flag.",
    inputSchema: z.object({
      database: z.string().describe("Absolute path to a .db/.sqlite file"),
      sql: z.string().describe("One read-only SQL statement"),
      limit: z.number().int().min(1).max(1000).optional().default(200),
    }),
  },
  async ({ database, sql, limit }) => {
    let db = null;
    try {
      const file = path.resolve(database);
      const stat = fs.statSync(file);
      if (!stat.isFile()) return errorResult(`Not a file: ${file}`);
      const normalized = sql.trim().replace(/;+\s*$/, "").trim();
      if (!normalized) return errorResult("SQL is empty");
      const statements = splitStatements(normalized);
      if (statements.length !== 1) {
        return errorResult("Only one SQL statement is allowed");
      }
      if (!/^(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(normalized)) {
        return errorResult("Only read-only SELECT, WITH, PRAGMA, or EXPLAIN statements are allowed");
      }
      if (/^PRAGMA\b/i.test(normalized) && normalized.includes("=")) {
        return errorResult("PRAGMA assignments are not allowed");
      }
      const { DatabaseSync } = await import("node:sqlite");
      db = new DatabaseSync(file, { readOnly: true });
      db.exec("PRAGMA busy_timeout = 5000");
      const statement = db.prepare(normalized);
      statement.setReadBigInts?.(true);
      const columns = statement.columns().map((column) => column.name);
      const rows = [];
      let truncated = false;
      for (const row of statement.iterate()) {
        if (rows.length >= limit) {
          truncated = true;
          break;
        }
        rows.push(columns.map((column) => serializeValue(row[column])));
      }
      return textResult(JSON.stringify({ database: file, columns, rows, rowCount: rows.length, truncated }, null, 2));
    } catch (error) {
      return errorResult(`SQLite query failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      try {
        db?.close();
      } catch {}
    }
  },
);

registerTool(
  "markitdown_convert",
  {
    title: "Convert a document to Markdown",
    description:
      "Convert a local document to Markdown using MarkItDown. Uses MARKITDOWN_BIN when set, otherwise the installed Bennett Toolbox component.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to a local document"),
      timeout_ms: z.number().int().min(1000).max(120000).optional().default(120000),
    }),
  },
  async ({ path: inputPath, timeout_ms }) => {
    try {
      const file = path.resolve(inputPath);
      const stat = fs.statSync(file);
      if (!stat.isFile()) return errorResult(`Not a file: ${file}`);
      const binary = findMarkitdown();
      if (!binary) {
        return errorResult(
          "MarkItDown is not available. Install the Document Converter component in Bennett Toolbox or set MARKITDOWN_BIN.",
        );
      }
      const env = { ...process.env };
      if (process.platform === "darwin") {
        const internal = path.join(path.dirname(binary), "_internal");
        if (fs.existsSync(internal)) {
          env.DYLD_LIBRARY_PATH = env.DYLD_LIBRARY_PATH
            ? `${internal}:${env.DYLD_LIBRARY_PATH}`
            : internal;
        }
      }
      const { stdout } = await execFileAsync(binary, [file], {
        env,
        timeout: timeout_ms || 120000,
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true,
        encoding: "utf8",
      });
      return textResult(stdout || "");
    } catch (error) {
      const detail = error?.stderr ? String(error.stderr).trim() : error instanceof Error ? error.message : String(error);
      return errorResult(`MarkItDown conversion failed: ${detail}`);
    }
  },
);

registerTool(
  "file_search",
  {
    title: "Search files by name",
    description:
      "Recursively search file names under a local directory. Symlinks are not followed. Returns absolute paths with size and modified time.",
    inputSchema: z.object({
      directory: z.string().describe("Absolute directory path"),
      query: z.string().min(1).describe("File name substring"),
      depth: z.number().int().min(1).max(20).optional().default(5),
      limit: z.number().int().min(1).max(500).optional().default(100),
      case_sensitive: z.boolean().optional().default(false),
    }),
  },
  async ({ directory, query, depth, limit, case_sensitive }) => {
    try {
      const root = path.resolve(directory);
      const stat = await fs.promises.stat(root);
      if (!stat.isDirectory()) return errorResult(`Not a directory: ${root}`);
      const needle = case_sensitive ? query : query.toLowerCase();
      const results = [];
      let scanned = 0;
      let truncated = false;
      const maxScan = 100000;
      const walk = async (current, level) => {
        if (results.length >= limit || scanned >= maxScan) {
          truncated = true;
          return;
        }
        let entries = [];
        try {
          entries = await fs.promises.readdir(current, { withFileTypes: true });
        } catch {
          return;
        }
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          if (results.length >= limit || scanned >= maxScan) {
            truncated = true;
            return;
          }
          scanned += 1;
          if (entry.isSymbolicLink()) continue;
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            if (level < depth) await walk(full, level + 1);
            continue;
          }
          if (!entry.isFile()) continue;
          const name = case_sensitive ? entry.name : entry.name.toLowerCase();
          if (!name.includes(needle)) continue;
          let info = null;
          try {
            info = await fs.promises.stat(full);
          } catch {}
          results.push({
            path: full,
            name: entry.name,
            size: info?.size ?? null,
            modifiedAt: info ? info.mtime.toISOString() : null,
          });
        }
      };
      await walk(root, 1);
      return textResult(
        JSON.stringify(
          { directory: root, query, scanned, count: results.length, truncated, results },
          null,
          2,
        ),
      );
    } catch (error) {
      return errorResult(`File search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "time_convert",
  {
    title: "Convert a timestamp between timezones",
    description:
      "Convert epoch seconds/milliseconds or an ISO date-time from one IANA timezone to another. Returns UTC, target ISO, formatted text, and epoch values.",
    inputSchema: z.object({
      value: z.union([z.string(), z.number()]).describe("Epoch seconds/milliseconds or ISO date-time"),
      from_timezone: z.string().optional().default("UTC").describe("IANA source timezone"),
      to_timezone: z.string().optional().default("UTC").describe("IANA target timezone"),
    }),
  },
  async ({ value, from_timezone, to_timezone }) => {
    try {
      for (const zone of [from_timezone, to_timezone]) {
        if (!IANAZone.isValidZone(zone)) return errorResult(`Invalid timezone: ${zone}`);
      }
      let date;
      const text = String(value).trim();
      if (typeof value === "number" || /^-?\d+$/.test(text)) {
        const number = Number(value);
        const millis = text.replace("-", "").length >= 13 ? number : number * 1000;
        date = DateTime.fromMillis(millis, { zone: from_timezone });
      } else {
        date = DateTime.fromISO(text, { zone: from_timezone });
      }
      if (!date.isValid) {
        return errorResult(`Invalid time value: ${date.invalidExplanation || text}`);
      }
      const target = date.setZone(to_timezone);
      return textResult(
        JSON.stringify(
          {
            sourceZone: from_timezone,
            targetZone: to_timezone,
            utc: date.toUTC().toISO(),
            target: target.toISO(),
            formatted: target.toFormat("yyyy-LL-dd HH:mm:ss"),
            offset: target.toFormat("ZZ"),
            epochSeconds: Math.floor(date.toMillis() / 1000),
            epochMillis: date.toMillis(),
          },
          null,
          2,
        ),
      );
    } catch (error) {
      return errorResult(`Time conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "cron_next",
  {
    title: "Calculate next cron runs",
    description:
      "Parse a 5/6-field cron expression in an IANA timezone and return the next run times (1-20).",
    inputSchema: z.object({
      expression: z.string().describe("Cron expression, e.g. */5 * * * *"),
      timezone: z.string().optional().default("UTC"),
      count: z.number().int().min(1).max(20).optional().default(5),
    }),
  },
  async ({ expression, timezone, count }) => {
    try {
      if (!IANAZone.isValidZone(timezone)) return errorResult(`Invalid timezone: ${timezone}`);
      const interval = CronExpressionParser.parse(expression, {
        tz: timezone,
        currentDate: new Date(),
      });
      const runs = [];
      for (let index = 0; index < count; index += 1) {
        const next = interval.next().toDate();
        runs.push({
          iso: DateTime.fromJSDate(next).setZone(timezone).toISO(),
          formatted: DateTime.fromJSDate(next).setZone(timezone).toFormat("yyyy-LL-dd HH:mm:ss"),
        });
      }
      return textResult(JSON.stringify({ expression, timezone, runs }, null, 2));
    } catch (error) {
      return errorResult(`Cron parse failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "qr_generate",
  {
    title: "Generate a QR code",
    description:
      "Generate a QR code from text. format=png returns MCP image content; format=svg returns SVG text.",
    inputSchema: z.object({
      text: z.string().min(1).describe("Text or URL to encode"),
      format: z.enum(["png", "svg"]).optional().default("png"),
      size: z.number().int().min(128).max(1024).optional().default(320),
      error_correction: z.enum(["L", "M", "Q", "H"]).optional().default("M"),
    }),
  },
  async ({ text, format, size, error_correction }) => {
    try {
      if (format === "svg") {
        const svg = await QRCode.toString(text, {
          type: "svg",
          width: size,
          margin: 2,
          errorCorrectionLevel: error_correction,
        });
        return textResult(svg);
      }
      const buffer = await QRCode.toBuffer(text, {
        type: "png",
        width: size,
        margin: 2,
        errorCorrectionLevel: error_correction,
      });
      return {
        content: [
          {
            type: "image",
            data: buffer.toString("base64"),
            mimeType: "image/png",
          },
          {
            type: "text",
            text: `Generated QR code: ${size}x${size} PNG, ${buffer.byteLength} bytes`,
          },
        ],
      };
    } catch (error) {
      return errorResult(`QR generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "encoding_convert",
  {
    title: "Encode or decode text",
    description:
      "Base64, URL, or hex encode/decode a string. Set component=true to use encodeURIComponent/decodeURIComponent for URL operations.",
    inputSchema: z.object({
      text: z.string().describe("Input text"),
      operation: z.enum([
        "base64_encode",
        "base64_decode",
        "url_encode",
        "url_decode",
        "hex_encode",
        "hex_decode",
      ]),
      component: z.boolean().optional().default(false),
    }),
  },
  async ({ text, operation, component }) => {
    try {
      switch (operation) {
        case "base64_encode":
          return textResult(Buffer.from(text, "utf8").toString("base64"));
        case "base64_decode":
          return textResult(Buffer.from(text, "base64").toString("utf8"));
        case "url_encode":
          return textResult(component ? encodeURIComponent(text) : encodeURI(text));
        case "url_decode":
          return textResult(component ? decodeURIComponent(text) : decodeURI(text));
        case "hex_encode":
          return textResult(Buffer.from(text, "utf8").toString("hex"));
        case "hex_decode": {
          const hex = text.replace(/\s+/g, "");
          if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
            return errorResult("Invalid hex input");
          }
          return textResult(Buffer.from(hex, "hex").toString("utf8"));
        }
        default:
          return errorResult(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return errorResult(`Encoding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "hash_text",
  {
    title: "Hash text or compute HMAC",
    description:
      "Compute MD5, SHA1, SHA256, SHA512, or HMAC-SHA256 for text. HMAC requires a key. Output is hex by default.",
    inputSchema: z.object({
      text: z.string(),
      algorithm: z.enum(["md5", "sha1", "sha256", "sha512", "hmac-sha256"]),
      key: z.string().optional(),
      output: z.enum(["hex", "base64"]).optional().default("hex"),
    }),
  },
  async ({ text, algorithm, key, output }) => {
    try {
      let digest;
      if (algorithm === "hmac-sha256") {
        if (!key) return errorResult("HMAC-SHA256 requires a key");
        digest = createHmac("sha256", key).update(text, "utf8").digest(output);
      } else {
        digest = createHash(algorithm).update(text, "utf8").digest(output);
      }
      return textResult(JSON.stringify({ algorithm, encoding: output, digest }));
    } catch (error) {
      return errorResult(`Hash failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "jwt_decode",
  {
    title: "Decode and optionally verify a JWT",
    description:
      "Decode JWT header/payload. If secret is provided for HS256/384/512, verifies the signature (without throwing on mismatch).",
    inputSchema: z.object({
      token: z.string(),
      secret: z.string().optional(),
    }),
  },
  async ({ token, secret }) => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return errorResult("Invalid JWT: expected three dot-separated parts");
      const [headerPart, payloadPart, signaturePart] = parts;
      const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
      let signatureValid = null;
      if (secret) {
        const hashName = { HS256: "sha256", HS384: "sha384", HS512: "sha512" }[header?.alg];
        if (hashName) {
          const expected = createHmac(hashName, secret)
            .update(`${headerPart}.${payloadPart}`)
            .digest();
          const actual = Buffer.from(signaturePart, "base64url");
          signatureValid =
            expected.length === actual.length && timingSafeEqual(expected, actual);
        } else {
          signatureValid = false;
        }
      }
      return textResult(JSON.stringify({ header, payload, signatureValid }, null, 2));
    } catch (error) {
      return errorResult(`JWT decode failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "regex_test",
  {
    title: "Test a regular expression",
    description:
      "Run a JavaScript regular expression against text. Returns matches, indexes, and groups; optionally returns the replaced text.",
    inputSchema: z.object({
      pattern: z.string().min(1).max(500),
      flags: z.string().optional().default("g"),
      text: z.string().max(1024 * 1024),
      replacement: z.string().optional(),
    }),
  },
  async ({ pattern, flags, text, replacement }) => {
    try {
      if (!/^[gimsuy]*$/.test(flags)) return errorResult(`Invalid regex flags: ${flags}`);
      const regex = new RegExp(pattern, flags);
      const matches = [];
      let truncated = false;
      if (flags.includes("g")) {
        for (const match of text.matchAll(regex)) {
          if (matches.length >= 1000) {
            truncated = true;
            break;
          }
          matches.push({
            match: match[0],
            index: match.index ?? 0,
            groups: match.slice(1),
            namedGroups: match.groups || null,
          });
        }
      } else {
        const match = regex.exec(text);
        if (match) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
            namedGroups: match.groups || null,
          });
        }
      }
      const result = { matches, truncated };
      if (replacement !== undefined) {
        result.replaced = text.replace(regex, replacement);
      }
      return textResult(JSON.stringify(result, null, 2));
    } catch (error) {
      return errorResult(`Regex failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "text_diff",
  {
    title: "Generate a unified diff",
    description: "Compare two text blocks and return a unified diff with added/removed line counts.",
    inputSchema: z.object({
      old_text: z.string().max(1024 * 1024),
      new_text: z.string().max(1024 * 1024),
      context: z.number().int().min(1).max(10).optional().default(3),
    }),
  },
  async ({ old_text, new_text, context }) => {
    try {
      if (old_text.split("\n").length > 5000 || new_text.split("\n").length > 5000) {
        return errorResult("Text exceeds the 5000-line limit");
      }
      const diff = createTwoFilesPatch("old", "new", old_text, new_text, "", "", { context });
      if (diff.length > 2 * 1024 * 1024) return errorResult("Diff exceeds the 2MB output limit");
      let added = 0;
      let removed = 0;
      for (const part of diffLines(old_text, new_text)) {
        if (part.added) added += part.count ?? part.value.split("\n").length - 1;
        if (part.removed) removed += part.count ?? part.value.split("\n").length - 1;
      }
      return textResult(JSON.stringify({ added, removed, diff }, null, 2));
    } catch (error) {
      return errorResult(`Diff failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "image_info",
  {
    title: "Read image metadata",
    description: "Read format, dimensions, channels, alpha, and file size for a local image.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to an image"),
    }),
  },
  async ({ path: inputPath }) => {
    try {
      const file = path.resolve(inputPath);
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) return errorResult(`Not a file: ${file}`);
      const sharp = await loadSharp();
      const metadata = await sharp(file).metadata();
      return textResult(
        JSON.stringify(
          {
            path: file,
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            channels: metadata.channels,
            hasAlpha: metadata.hasAlpha,
            space: metadata.space,
            size: stat.size,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      return errorResult(`Image info failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

registerTool(
  "image_convert",
  {
    title: "Convert an image",
    description:
      "Convert a local image to PNG, JPEG, or WebP, with optional quality and max dimensions. Returns MCP image content; does not write files.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path to an image"),
      format: z.enum(["png", "jpeg", "webp"]),
      quality: z.number().int().min(1).max(100).optional().default(82),
      width: z.number().int().min(16).max(4096).optional(),
      height: z.number().int().min(16).max(4096).optional(),
    }),
  },
  async ({ path: inputPath, format, quality, width, height }) => {
    try {
      const file = path.resolve(inputPath);
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) return errorResult(`Not a file: ${file}`);
      const sharp = await loadSharp();
      let pipeline = sharp(file).rotate();
      if (width || height) {
        pipeline = pipeline.resize({
          width,
          height,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      if (format === "jpeg") pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      else if (format === "webp") pipeline = pipeline.webp({ quality });
      else pipeline = pipeline.png({ compressionLevel: 9 });
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      if (data.byteLength > 10 * 1024 * 1024) {
        return errorResult("Converted image exceeds the 10MB limit");
      }
      const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      return {
        content: [
          { type: "image", data: data.toString("base64"), mimeType },
          {
            type: "text",
            text: JSON.stringify(
              { format, width: info.width, height: info.height, bytes: data.byteLength },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return errorResult(`Image convert failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
void writeLog({
  event: "startup",
  server: SERVER_NAME,
  version: SERVER_VERSION,
  node: process.version,
  platform: process.platform,
  pid: process.pid,
  logFile: LOG_FILE,
});
process.on("uncaughtException", (error) => {
  void writeLog({ event: "uncaughtException", error: error.stack || String(error) });
});
process.on("unhandledRejection", (error) => {
  void writeLog({ event: "unhandledRejection", error: error instanceof Error ? error.stack || error.message : String(error) });
});
console.error(`${SERVER_NAME} MCP server running on stdio (v${SERVER_VERSION})`);
console.error(`[mcp] log file: ${LOG_FILE}`);
