import { Queue } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES } from "@guntan/config";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const xmlQueue = new Queue(QUEUE_NAMES.XML_IMPORT, { connection });
export const visibilityQueue = new Queue(QUEUE_NAMES.VISIBILITY_COMPILE, { connection });
export const searchQueue = new Queue(QUEUE_NAMES.SEARCH_REINDEX, { connection });
export { connection };
