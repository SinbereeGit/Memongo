import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import { command, createDatabase } from "../../src/index.js";

const _ = command;
const ROOT_DIR = path.resolve(".tmp/test/performance/speed");

export type SpeedRoundResult = {
  size: number;
  debounceDelay: number;
  generationMs: number;
  seedMs: number;
  seedDocsPerSec: number;
  persistedBytesAfterSeed: number;
  pointCreateOpsPerSec: number;
  pointReadOpsPerSec: number;
  pointUpdateOpsPerSec: number;
  pointDeleteOpsPerSec: number;
  queryOpsPerSec: number;
};

export type SpeedAggregateMetrics = {
  sampleCount: number;
  generationMsAvg: number;
  generationMsMin: number;
  generationMsMax: number;
  seedMsAvg: number;
  seedMsMin: number;
  seedMsMax: number;
  seedDocsPerSecAvg: number;
  persistedBytesAvg: number;
  persistedBytesMin: number;
  persistedBytesMax: number;
  pointCreateOpsPerSecAvg: number;
  pointCreateOpsPerSecMin: number;
  pointCreateOpsPerSecMax: number;
  pointReadOpsPerSecAvg: number;
  pointReadOpsPerSecMin: number;
  pointReadOpsPerSecMax: number;
  pointUpdateOpsPerSecAvg: number;
  pointUpdateOpsPerSecMin: number;
  pointUpdateOpsPerSecMax: number;
  pointDeleteOpsPerSecAvg: number;
  pointDeleteOpsPerSecMin: number;
  pointDeleteOpsPerSecMax: number;
  queryOpsPerSecAvg: number;
  queryOpsPerSecMin: number;
  queryOpsPerSecMax: number;
};

export type SpeedBenchmarkReport = {
  kind: "speed";
  generatedAt: string;
  durationMs: number;
  environment: {
    runtime: string;
    platform: string;
    persistence: string;
  };
  config: {
    sizes: number[];
    debounceDelays: number[];
    rounds: number;
    warmup: number;
    smallOps: number;
    queryLimit: number;
  };
  matrixRows: Array<{
    datasetSize: number;
    debounceDelayMs: number;
    metrics: SpeedAggregateMetrics;
  }>;
  byDelay: Array<{ debounceDelayMs: number; metrics: SpeedAggregateMetrics }>;
  bySize: Array<{ datasetSize: number; metrics: SpeedAggregateMetrics }>;
  global: SpeedAggregateMetrics;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDelays = (value: string | undefined): number[] => {
  if (!value) return [0, 10, 50, 100, 200, 500, 1000];
  const parsed = value
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x >= 0)
    .map((x) => Math.floor(x));
  return [...new Set(parsed)].sort((a, b) => a - b);
};

const parseSizes = (value: string | undefined): number[] => {
  if (!value) return [10_000, 50_000, 200_000, 500_000];
  const parsed = value
    .split(",")
    .map((x) => {
      const trimmed = x.trim().toLowerCase();
      const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([km]?)$/);
      if (!match) return NaN;
      const num = Number(match[1]);
      const suffix = match[2];
      if (suffix === "k") return num * 1_000;
      if (suffix === "m") return num * 1_000_000;
      return num;
    })
    .filter((x) => Number.isFinite(x) && x > 0)
    .map((x) => Math.floor(x));
  return [...new Set(parsed)].sort((a, b) => a - b);
};

const average = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;
const min = (values: number[]): number => Math.min(...values);
const max = (values: number[]): number => Math.max(...values);

const formatMs = (ms: number) => `${ms.toFixed(2)} ms`;
const formatRate = (opsPerSec: number) => `${opsPerSec.toFixed(2)} ops/s`;
const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

const measure = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await Promise.resolve(fn());
  return performance.now() - start;
};

const rateFrom = (operations: number, elapsedMs: number): number => {
  if (elapsedMs <= 0) return Number.POSITIVE_INFINITY;
  return (operations * 1000) / elapsedMs;
};

const ensureCleanRoot = () => {
  fs.rmSync(ROOT_DIR, { recursive: true, force: true });
  fs.mkdirSync(ROOT_DIR, { recursive: true });
};

const toSamples = (rows: SpeedRoundResult[], pick: (row: SpeedRoundResult) => number): number[] => rows.map(pick);

const buildMetrics = (rows: SpeedRoundResult[]): SpeedAggregateMetrics => {
  const generation = toSamples(rows, (r) => r.generationMs);
  const seedMs = toSamples(rows, (r) => r.seedMs);
  const seedRate = toSamples(rows, (r) => r.seedDocsPerSec);
  const persisted = toSamples(rows, (r) => r.persistedBytesAfterSeed);
  const createRate = toSamples(rows, (r) => r.pointCreateOpsPerSec);
  const readRate = toSamples(rows, (r) => r.pointReadOpsPerSec);
  const updateRate = toSamples(rows, (r) => r.pointUpdateOpsPerSec);
  const deleteRate = toSamples(rows, (r) => r.pointDeleteOpsPerSec);
  const queryRate = toSamples(rows, (r) => r.queryOpsPerSec);

  return {
    sampleCount: rows.length,
    generationMsAvg: average(generation),
    generationMsMin: min(generation),
    generationMsMax: max(generation),
    seedMsAvg: average(seedMs),
    seedMsMin: min(seedMs),
    seedMsMax: max(seedMs),
    seedDocsPerSecAvg: average(seedRate),
    persistedBytesAvg: average(persisted),
    persistedBytesMin: min(persisted),
    persistedBytesMax: max(persisted),
    pointCreateOpsPerSecAvg: average(createRate),
    pointCreateOpsPerSecMin: min(createRate),
    pointCreateOpsPerSecMax: max(createRate),
    pointReadOpsPerSecAvg: average(readRate),
    pointReadOpsPerSecMin: min(readRate),
    pointReadOpsPerSecMax: max(readRate),
    pointUpdateOpsPerSecAvg: average(updateRate),
    pointUpdateOpsPerSecMin: min(updateRate),
    pointUpdateOpsPerSecMax: max(updateRate),
    pointDeleteOpsPerSecAvg: average(deleteRate),
    pointDeleteOpsPerSecMin: min(deleteRate),
    pointDeleteOpsPerSecMax: max(deleteRate),
    queryOpsPerSecAvg: average(queryRate),
    queryOpsPerSecMin: min(queryRate),
    queryOpsPerSecMax: max(queryRate),
  };
};

const printMetrics = (label: string, metrics: SpeedAggregateMetrics) => {
  console.log(label);
  console.table({
    dataset_generation: {
      avg: formatMs(metrics.generationMsAvg),
      min: formatMs(metrics.generationMsMin),
      max: formatMs(metrics.generationMsMax),
    },
    seed_insert_and_flush: {
      avg: formatMs(metrics.seedMsAvg),
      min: formatMs(metrics.seedMsMin),
      max: formatMs(metrics.seedMsMax),
      avg_docs_per_sec: formatRate(metrics.seedDocsPerSecAvg),
    },
    persisted_size_after_seed: {
      avg: formatKb(metrics.persistedBytesAvg),
      min: formatKb(metrics.persistedBytesMin),
      max: formatKb(metrics.persistedBytesMax),
    },
    point_create_rate: {
      avg: formatRate(metrics.pointCreateOpsPerSecAvg),
      min: formatRate(metrics.pointCreateOpsPerSecMin),
      max: formatRate(metrics.pointCreateOpsPerSecMax),
    },
    point_read_rate: {
      avg: formatRate(metrics.pointReadOpsPerSecAvg),
      min: formatRate(metrics.pointReadOpsPerSecMin),
      max: formatRate(metrics.pointReadOpsPerSecMax),
    },
    point_update_rate: {
      avg: formatRate(metrics.pointUpdateOpsPerSecAvg),
      min: formatRate(metrics.pointUpdateOpsPerSecMin),
      max: formatRate(metrics.pointUpdateOpsPerSecMax),
    },
    point_delete_rate: {
      avg: formatRate(metrics.pointDeleteOpsPerSecAvg),
      min: formatRate(metrics.pointDeleteOpsPerSecMin),
      max: formatRate(metrics.pointDeleteOpsPerSecMax),
    },
    small_query_rate: {
      avg: formatRate(metrics.queryOpsPerSecAvg),
      min: formatRate(metrics.queryOpsPerSecMin),
      max: formatRate(metrics.queryOpsPerSecMax),
    },
  });
};

async function runSingleRound(params: {
  size: number;
  debounceDelay: number;
  round: number;
  smallOps: number;
  queryLimit: number;
}): Promise<SpeedRoundResult> {
  const { size, debounceDelay, round, smallOps, queryLimit } = params;

  const filePath = path.join(ROOT_DIR, `delay-${debounceDelay}-size-${size}-round-${round}.json`);

  const db = createDatabase(
    {
      readDatabaseContentFunc: async () => {
        try {
          return JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch {
          return {};
        }
      },
      writeDatabaseContentFunc: async (data, resolve, reject) => {
        try {
          fs.writeFileSync(filePath, JSON.stringify(data));
          resolve();
        } catch (error) {
          reject(error);
        }
      },
    },
    debounceDelay,
  );

  await db.init();
  const users = db.createCollection("users");

  let seedDocs: Array<{ test_id: number; age: number; active: boolean; score: number }> = [];

  const generationMs = await measure(() => {
    seedDocs = Array.from({ length: size }, (_, i) => ({
      test_id: i,
      age: i % 100,
      active: i % 2 === 0,
      score: i % 1000,
    }));
  });

  const seedIds: string[] = [];
  const seedMs = await measure(async () => {
    for (const doc of seedDocs) {
      const { _id } = users.add(doc);
      seedIds.push(_id);
    }
    await db.flush();
  });

  const persistedBytesAfterSeed = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

  const actualOps = Math.max(1, Math.min(smallOps, seedIds.length));
  const createdIds: string[] = [];

  const pointCreateMs = await measure(async () => {
    for (let i = 0; i < actualOps; i++) {
      const { _id } = users.add({
        test_id: size + i,
        age: (size + i) % 100,
        active: i % 2 === 0,
        score: (size + i) % 1000,
      });
      createdIds.push(_id);
    }
    await db.flush();
  });

  const pointReadMs = await measure(() => {
    for (let i = 0; i < actualOps; i++) {
      const id = seedIds[i];
      if (id) users.doc(id).get();
    }
  });

  const pointUpdateMs = await measure(async () => {
    for (let i = 0; i < actualOps; i++) {
      const id = seedIds[i];
      if (id) users.doc(id).update({ score: _.inc(1) });
    }
    await db.flush();
  });

  const queryMs = await measure(() => {
    for (let i = 0; i < actualOps; i++) {
      users.where({ age: _.gte(20), active: true }).orderBy("score", "desc").limit(queryLimit).get();
    }
  });

  const pointDeleteMs = await measure(async () => {
    for (const id of createdIds) users.doc(id).remove();
    await db.flush();
  });

  fs.rmSync(filePath, { force: true });

  return {
    size,
    debounceDelay,
    generationMs,
    seedMs,
    seedDocsPerSec: rateFrom(size, seedMs),
    persistedBytesAfterSeed,
    pointCreateOpsPerSec: rateFrom(actualOps, pointCreateMs),
    pointReadOpsPerSec: rateFrom(actualOps, pointReadMs),
    pointUpdateOpsPerSec: rateFrom(actualOps, pointUpdateMs),
    pointDeleteOpsPerSec: rateFrom(actualOps, pointDeleteMs),
    queryOpsPerSec: rateFrom(actualOps, queryMs),
  };
}

export async function testSpeed(): Promise<SpeedBenchmarkReport> {
  const startedAt = performance.now();

  const sizes = parseSizes(process.env.SPEED_SIZES);
  const debounceDelays = parseDelays(process.env.SPEED_DEBOUNCE_DELAYS);
  const rounds = parseNumber(process.env.SPEED_ROUNDS, 1);
  const warmup = parseNumber(process.env.SPEED_WARMUP, 0);
  const smallOps = parseNumber(process.env.SPEED_SMALL_OPS, 30);
  const queryLimit = parseNumber(process.env.SPEED_QUERY_LIMIT, 100);

  if (sizes.length === 0) throw new Error("No valid SPEED_SIZES. Example: 10k,50k,200k,500k");
  if (debounceDelays.length === 0) throw new Error("No valid SPEED_DEBOUNCE_DELAYS. Example: 0,10,50,100,200,500,1000");
  if (rounds <= 0) throw new Error("SPEED_ROUNDS must be > 0");

  ensureCleanRoot();

  console.log("=== Memongo Speed Benchmark Report ===");
  console.log("Goal: compare small-scale CRUD speed under different dataset sizes and debounce delays.");
  console.log("Temporary files: .tmp/test/performance/speed");
  console.log(`Sizes: ${sizes.join(", ")}`);
  console.log(`Debounce delays (ms): ${debounceDelays.join(", ")}`);
  console.log(`Rounds per combination: ${rounds}`);
  console.log(`Small CRUD ops per round: ${smallOps}`);
  console.log(`Small query limit: ${queryLimit}`);
  console.log(`Warmup rounds: ${warmup}\n`);

  if (warmup > 0) {
    const warmupSize = Math.max(1_000, Math.floor(sizes[0]! / 2));
    const warmupDelay = debounceDelays[0]!;
    for (let i = 1; i <= warmup; i++) {
      await runSingleRound({
        size: warmupSize,
        debounceDelay: warmupDelay,
        round: i,
        smallOps: Math.max(10, Math.floor(smallOps / 2)),
        queryLimit: Math.max(20, Math.floor(queryLimit / 2)),
      });
      console.log(`warmup ${i}/${warmup} completed (size=${warmupSize}, delay=${warmupDelay}ms)`);
    }
    console.log("");
  }

  const allRows: SpeedRoundResult[] = [];

  for (const size of sizes) {
    for (const delay of debounceDelays) {
      for (let round = 1; round <= rounds; round++) {
        const row = await runSingleRound({ size, debounceDelay: delay, round, smallOps, queryLimit });
        allRows.push(row);

        console.log(
          `size=${size} delay=${delay}ms round=${round}/${rounds} | gen=${formatMs(row.generationMs)} | seed=${formatMs(row.seedMs)} (${formatRate(row.seedDocsPerSec)}) | create=${formatRate(row.pointCreateOpsPerSec)} | read=${formatRate(row.pointReadOpsPerSec)} | update=${formatRate(row.pointUpdateOpsPerSec)} | delete=${formatRate(row.pointDeleteOpsPerSec)} | query=${formatRate(row.queryOpsPerSec)}`,
        );
      }
    }
  }

  const matrixRows = sizes.flatMap((size) =>
    debounceDelays.map((delay) => {
      const rows = allRows.filter((r) => r.size === size && r.debounceDelay === delay);
      return {
        datasetSize: size,
        debounceDelayMs: delay,
        metrics: buildMetrics(rows),
      };
    }),
  );

  console.log("\n=== Detailed Matrix (size x delay) ===");
  console.table(
    matrixRows.map((x) => ({
      dataset_size: x.datasetSize,
      debounce_delay_ms: x.debounceDelayMs,
      generation_avg: formatMs(x.metrics.generationMsAvg),
      seed_docs_per_sec_avg: formatRate(x.metrics.seedDocsPerSecAvg),
      create_ops_per_sec_avg: formatRate(x.metrics.pointCreateOpsPerSecAvg),
      read_ops_per_sec_avg: formatRate(x.metrics.pointReadOpsPerSecAvg),
      update_ops_per_sec_avg: formatRate(x.metrics.pointUpdateOpsPerSecAvg),
      delete_ops_per_sec_avg: formatRate(x.metrics.pointDeleteOpsPerSecAvg),
      query_ops_per_sec_avg: formatRate(x.metrics.queryOpsPerSecAvg),
    })),
  );

  const byDelay = debounceDelays.map((delay) => ({
    debounceDelayMs: delay,
    metrics: buildMetrics(allRows.filter((r) => r.debounceDelay === delay)),
  }));

  const bySize = sizes.map((size) => ({
    datasetSize: size,
    metrics: buildMetrics(allRows.filter((r) => r.size === size)),
  }));

  const global = buildMetrics(allRows);

  console.log("\n=== Summary by Debounce Delay ===");
  for (const row of byDelay) printMetrics(`debounceDelay=${row.debounceDelayMs}ms`, row.metrics);

  console.log("\n=== Summary by Dataset Size ===");
  for (const row of bySize) printMetrics(`datasetSize=${row.datasetSize}`, row.metrics);

  console.log("\n=== Global Summary ===");
  printMetrics("all combinations", global);

  const durationMs = performance.now() - startedAt;
  console.log(`Speed benchmark report completed in ${formatMs(durationMs)}.`);

  return {
    kind: "speed",
    generatedAt: new Date().toISOString(),
    durationMs,
    environment: {
      runtime: `Node.js ${process.version}`,
      platform: `${process.platform} ${process.arch}`,
      persistence: "JSON file adapter in Node.js using fs.readFileSync + fs.writeFileSync, persisting full database snapshot per write, benchmark waits with db.flush()",
    },
    config: {
      sizes,
      debounceDelays,
      rounds,
      warmup,
      smallOps,
      queryLimit,
    },
    matrixRows,
    byDelay,
    bySize,
    global,
  };
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (import.meta.url === entryUrl) {
  testSpeed().catch((error) => {
    console.error("Speed benchmark failed:", error);
    process.exitCode = 1;
  });
}
