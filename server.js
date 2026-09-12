"use strict";
// Hostinger: Start command VE Entry file ikisi birden OLAMAZ.
// Tek satır: node server.js
const { pathToFileURL } = require("node:url");
const { join } = require("node:path");

import(pathToFileURL(join(__dirname, "scripts/hostinger-start.mjs")).href).catch((err) => {
  console.error("[hostinger] start yüklenemedi:", err);
  process.exit(1);
});
