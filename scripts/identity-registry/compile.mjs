// Compiles contracts/AgentIdentityRegistry.sol with the pure-JS solc package
// (no Foundry/Hardhat/native toolchain needed) and writes the ABI + bytecode
// to build/AgentIdentityRegistry.json for deploy.mjs to consume.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const CONTRACT_PATH = path.join(__dirname, "contracts", "AgentIdentityRegistry.sol");
const BUILD_DIR = path.join(__dirname, "build");

function findImport(importPath) {
  try {
    const resolved = require.resolve(importPath, { paths: [__dirname] });
    return { contents: fs.readFileSync(resolved, "utf8") };
  } catch {
    return { error: `File not found: ${importPath}` };
  }
}

const source = fs.readFileSync(CONTRACT_PATH, "utf8");
const input = {
  language: "Solidity",
  sources: { "AgentIdentityRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

const errors = (output.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}
for (const w of (output.errors || []).filter((e) => e.severity === "warning")) {
  console.warn(w.formattedMessage);
}

const contract = output.contracts["AgentIdentityRegistry.sol"]["AgentIdentityRegistry"];
fs.mkdirSync(BUILD_DIR, { recursive: true });
fs.writeFileSync(
  path.join(BUILD_DIR, "AgentIdentityRegistry.json"),
  JSON.stringify({ abi: contract.abi, bytecode: "0x" + contract.evm.bytecode.object }, null, 2)
);

console.log("Compiled -> build/AgentIdentityRegistry.json");
