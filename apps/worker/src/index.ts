import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@guntan/config";
import { compileVisibility, db } from "@guntan/db";
import { runXmlImport } from "@guntan/import";
import { logger } from "@guntan/observability";
import { reindexAll } from "@guntan/search";
import { connection, searchQueue } from "./queues";

new Worker(
  QUEUE_NAMES.XML_IMPORT,
  async (job) => {
    logger.info({ feedId: job.data.feedId }, "xml import start");
    const result = await runXmlImport(job.data.feedId);
    await searchQueue.add("reindex", {});
    return result;
  },
  { connection, concurrency: 1 },
);

new Worker(
  QUEUE_NAMES.VISIBILITY_COMPILE,
  async (job) => {
    await compileVisibility(db, job.data.tenantId);
    await searchQueue.add("reindex", {});
  },
  { connection, concurrency: 1 },
);

new Worker(
  QUEUE_NAMES.SEARCH_REINDEX,
  async () => {
    await reindexAll();
  },
  { connection, concurrency: 1 },
);

logger.info("Worker listening");
