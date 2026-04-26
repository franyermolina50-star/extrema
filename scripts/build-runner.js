#!/usr/bin/env node

const Module = require("node:module");
const { PassThrough } = require("node:stream");

const workerModulePath = require.resolve("../node_modules/next/dist/lib/worker.js");
const originalLoad = Module._load;

class InProcessWorker {
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath;
    this.options = options;
    this.module = require(workerPath);
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();

    const methodNames = new Set(options.exposedMethods || []);
    for (const name of methodNames) {
      if (typeof this.module[name] === "function") {
        this[name] = async (...args) => this.module[name](...args);
      }
    }
  }

  getStdout() {
    return this.stdout;
  }

  getStderr() {
    return this.stderr;
  }

  async end() {
    if (!this.stdout.destroyed) {
      this.stdout.end();
    }
    if (!this.stderr.destroyed) {
      this.stderr.end();
    }
  }
}

Module._load = function patchedLoad(request, parent, isMain) {
  try {
    const resolved = Module._resolveFilename(request, parent, isMain);
    if (resolved === workerModulePath) {
      return {
        Worker: InProcessWorker,
        getNextBuildDebuggerPortOffset: () => 0
      };
    }
  } catch {
    // Fall through to the original loader.
  }

  return originalLoad.apply(this, arguments);
};

process.env.NODE_ENV = "production";

const buildModule = require("../node_modules/next/dist/build");
const build = buildModule.default;

build(process.cwd()).catch((error) => {
  console.error(error);
  process.exit(1);
});
