#!/usr/bin/env node

const path = require("node:path");

const loadConfig = require("../node_modules/next/dist/server/config").default;
const { startServer } = require("../node_modules/next/dist/server/lib/start-server");
const { PHASE_DEVELOPMENT_SERVER } = require("../node_modules/next/dist/shared/lib/constants");
const { setGlobal, traceId } = require("../node_modules/next/dist/trace/shared");

function readArgValue(argv, names) {
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    for (const name of names) {
      if (current === name) {
        const nextValue = argv[index + 1];
        return nextValue && !nextValue.startsWith("-") ? nextValue : null;
      }
      if (current.startsWith(`${name}=`)) {
        return current.slice(name.length + 1);
      }
    }
  }

  return null;
}

function toPort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const dir = process.cwd();
  const argv = process.argv.slice(2);

  process.env.NODE_ENV = "development";
  process.env.NEXT_PRIVATE_TRACE_ID = traceId;

  const port = toPort(readArgValue(argv, ["-p", "--port"]) ?? process.env.PORT, 3000);
  const hostname = readArgValue(argv, ["-H", "--hostname"]) ?? undefined;
  const allowRetry = !readArgValue(argv, ["-p", "--port"]) && !process.env.PORT;

  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, dir, { silent: false });
  const distDir = path.join(dir, config.distDir ?? ".next");

  setGlobal("phase", PHASE_DEVELOPMENT_SERVER);
  setGlobal("distDir", distDir);

  await startServer({
    dir,
    port,
    allowRetry,
    isDev: true,
    hostname
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
