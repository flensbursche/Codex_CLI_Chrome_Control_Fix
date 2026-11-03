const { spawn } = require("child_process");

const version = process.env.CHROME_DEVTOOLS_MCP_VERSION || "1.12.0";
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid CHROME_DEVTOOLS_MCP_VERSION: ${version}`);
}

const child = spawn(
  process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "npx",
  process.platform === "win32"
    ? [
        "/d",
        "/s",
        "/c",
        `npx -y chrome-devtools-mcp@${version} --autoConnect --no-usage-statistics --no-performance-crux --no-javascript-evaluation`,
      ]
    : [
        "-y",
        `chrome-devtools-mcp@${version}`,
        "--autoConnect",
        "--no-usage-statistics",
        "--no-performance-crux",
        "--no-javascript-evaluation",
      ],
  { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
);

let buffer = "";
let completed = false;
let timeout = null;

function send(message) {
  if (completed || !child.stdin.writable) return;
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function stopChild() {
  if (!child.pid || child.exitCode !== null || child.killed) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.unref();
  } else {
    child.kill("SIGTERM");
  }
}

function finish(code, result) {
  if (completed) return;
  completed = true;
  if (timeout) clearTimeout(timeout);
  console.log(JSON.stringify(result, null, 2));
  child.stdin.end();
  stopChild();
  process.exitCode = code;
}

child.stderr.on("data", (data) => process.stderr.write(data));
child.on("error", (error) => finish(1, { status: "fail", reason: "spawn_error", detail: error.message }));
child.stdout.on("data", (data) => {
  buffer += data.toString();
  let newline;
  while ((newline = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (message.id === 1 && message.result) {
      send({ jsonrpc: "2.0", method: "notifications/initialized" });
      send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    } else if (message.id === 2 && message.result) {
      const names = (message.result.tools || []).map((tool) => tool.name);
      if (!names.includes("list_pages")) {
        finish(1, { status: "fail", reason: "list_pages_tool_missing", tools: names });
      } else {
        send({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "list_pages", arguments: {} },
        });
      }
    } else if (message.id === 3) {
      if (message.error) {
        finish(1, { status: "fail", reason: "tool_call_error", error: message.error });
      } else {
        finish(0, { status: "pass", reason: "chrome_connected", pages: message.result });
      }
    }
  }
});

timeout = setTimeout(
  () => finish(1, { status: "fail", reason: "timeout_waiting_for_chrome" }),
  30_000,
);

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "codex-cli-chrome-control-smoke", version: "1.0.1" },
  },
});
