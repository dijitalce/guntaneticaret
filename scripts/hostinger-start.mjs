import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Dedicated, argument-free entry point for hosts (like Hostinger's "Application
// startup file" field) that execute a single JS file directly with `node`
// rather than running an npm script.
//
// Runs Next's CLI in-process (instead of spawning a child process) so the
// process this host actually manages is the one holding the server socket.
// If we spawned a child here, a SIGTERM sent by the host's process manager
// to restart the app would only reach this wrapper, not the child, leaving
// an orphaned process still bound to the port and causing EADDRINUSE on the
// next restart attempt.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "apps/storefront");
process.chdir(appDir);

const require = createRequire(join(appDir, "package.json"));
const port = process.env.PORT ?? "3000";
process.argv = [process.argv[0], "next", "start", "--hostname", "0.0.0.0", "--port", port];

require("next/dist/bin/next");
