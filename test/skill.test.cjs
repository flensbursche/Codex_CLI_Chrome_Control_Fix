const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const plugin = JSON.parse(read("plugin.json"));
const mcp = JSON.parse(read("mcp.json"));
const packageJson = JSON.parse(read("package.json"));
const evals = JSON.parse(read("skills/chrome-devtools-control/evals/cases.json"));
const skill = read("skills/chrome-devtools-control/SKILL.md");
const agentMetadata = read("skills/chrome-devtools-control/agents/openai.yaml");

test("portable plugin metadata and project version stay aligned", () => {
  const pluginInterface = plugin.extensions["com.openai"].interface;
  assert.equal(plugin.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  assert.equal(plugin.name, "codex-cli-chrome-control");
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.extensions["com.openai"].requires_local_executor, true);
  assert.equal(pluginInterface.category, "Developer Tools");
  assert.ok(pluginInterface.displayName.length <= 30);
  assert.ok(pluginInterface.shortDescription.length <= 30);
  assert.ok(pluginInterface.defaultPrompt.every((prompt) => prompt.length <= 128));
});

test("plugin bundles the pinned privacy-focused Chrome MCP command", () => {
  const server = mcp.mcpServers["chrome-devtools"];
  assert.equal(mcp.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
  assert.equal(server.type, "stdio");
  assert.equal(server.command, "npx");
  assert.deepEqual(server.args, [
    "-y",
    "chrome-devtools-mcp@1.12.0",
    "--autoConnect",
    "--no-usage-statistics",
    "--no-performance-crux",
    "--no-javascript-evaluation",
  ]);
});

test("skill identity and MCP dependency agree with the plugin", () => {
  assert.match(skill, /^---\r?\nname: chrome-devtools-control\r?\n/m);
  assert.match(agentMetadata, /value: "chrome-devtools"/);
  assert.match(agentMetadata, /transport: "stdio"/);
  assert.ok(Object.hasOwn(mcp.mcpServers, "chrome-devtools"));
});

test("skill eval inventory covers activation, ambiguity, exclusion, and safety", () => {
  assert.equal(evals.skill, "chrome-devtools-control");
  assert.equal(new Set(evals.cases.map(({ id }) => id)).size, evals.cases.length);
  assert.deepEqual(
    new Set(evals.cases.map(({ category }) => category)),
    new Set([
      "direct_activation",
      "indirect_activation",
      "incomplete_input",
      "non_activation",
      "safety_boundary",
      "missing_dependency",
    ]),
  );
  for (const evalCase of evals.cases) {
    assert.equal(typeof evalCase.shouldActivate, "boolean");
    assert.ok(evalCase.prompt.length > 20);
    assert.ok(evalCase.expectations.length > 0);
  }
});
