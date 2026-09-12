"use strict";
// Hostinger Entry file: node server.js (pnpm/npm sarmalayıcısı olmadan).
const { pathToFileURL } = require("node:url");
const { join } = require("node:path");

import(pathToFileURL(join(__dirname, "scripts/hostinger-start.mjs")).href).catch((err) => {
  console.error("[hostinger] start yüklenemedi:", err);
  process.exit(1);
});
