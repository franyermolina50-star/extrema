const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Cleaned Next.js dev cache.");
} catch (error) {
  console.error("Failed to clean Next.js dev cache.");
  console.error(error);
  process.exit(1);
}
