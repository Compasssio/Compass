#!/usr/bin/env node
import { createInterface } from "node:readline";
import { bigimgs, counts, evalInPage, layers, listTargets, rss, snapshot, watch } from "./compass-diag.mjs";

const none = { type: "object", properties: {}, required: [] };

const TOOLS = [
  { name: "compass_pages", description: "List debuggable Compass WebView2 page targets.", inputSchema: none },
  { name: "compass_eval", description: "Evaluate a JavaScript expression inside the live Compass page and return the value.", inputSchema: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] } },
  { name: "compass_counts", description: "Live totals: DOM nodes, img elements, loaded images with estimated decoded MB, videos, canvases, JS heap MB.", inputSchema: none },
  { name: "compass_layers", description: "Per view-layer attribution: active/parked state, display/visibility/content-visibility, DOM nodes, images, estimated decoded MB, videos.", inputSchema: none },
  { name: "compass_bigimgs", description: "Top 25 loaded images by estimated decoded size.", inputSchema: none },
  { name: "compass_rss", description: "OS-level RSS for Compass.exe and its WebView2 processes, grouped by process type (browser, renderer, gpu-process, utility).", inputSchema: none },
  { name: "compass_watch", description: "Sample heap, DOM, image, and RSS totals over time and report the delta. Finds slow climbs.", inputSchema: { type: "object", properties: { seconds: { type: "number" }, interval: { type: "number" } }, required: [] } },
  { name: "compass_snapshot", description: "Take a V8 heap snapshot to compass/.diag and report size plus detached-node reference count.", inputSchema: none },
];

async function run(name, args) {
  switch (name) {
    case "compass_pages":
      return (await listTargets()).map((t) => ({ title: t.title, url: t.url }));
    case "compass_eval":
      return evalInPage(String(args?.expression ?? ""));
    case "compass_counts":
      return counts();
    case "compass_layers":
      return layers();
    case "compass_bigimgs":
      return bigimgs();
    case "compass_rss":
      return rss();
    case "compass_watch":
      return watch(Math.min(120, Number(args?.seconds ?? 30)), Math.max(2, Number(args?.interval ?? 5)));
    case "compass_snapshot":
      return snapshot();
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function replyError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (id == null) return;
  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "compass-diag", version: "1.0.0" },
      });
    } else if (method === "tools/list") {
      reply(id, { tools: TOOLS });
    } else if (method === "tools/call") {
      const data = await run(params.name, params.arguments ?? {});
      reply(id, { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
    } else if (method === "ping") {
      reply(id, {});
    } else {
      replyError(id, -32601, `method not found: ${method}`);
    }
  } catch (e) {
    if (method === "tools/call") reply(id, { content: [{ type: "text", text: String(e?.message ?? e) }], isError: true });
    else replyError(id, -32603, String(e?.message ?? e));
  }
});
