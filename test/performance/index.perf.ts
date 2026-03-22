import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

// @ts-ignore - resolved at runtime by ts-node ESM loader
import { testSpeed, type SpeedAggregateMetrics, type SpeedBenchmarkReport } from "./speed.perf.js";
// @ts-ignore - resolved at runtime by ts-node ESM loader
import { testCapacity, type CapacityAggregateMetrics, type CapacityBenchmarkReport } from "./capacity.perf.js";

const REPORT_DIR = path.resolve("reports/performance");

const formatMs = (ms: number) => `${ms.toFixed(2)} ms`;
const formatRate = (opsPerSec: number) => `${opsPerSec.toFixed(2)} ops/s`;
const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const formatBpd = (bytes: number) => `${bytes.toFixed(2)} B/doc`;

const fmt = (v: number) => Number.isFinite(v) ? v.toFixed(2) : "NA";

const toTable = (rows: Array<Record<string, string | number>>): string => {
  if (rows.length === 0) return "(no data)";
  const first = rows[0];
  if (!first) return "(no data)";
  const headers = Object.keys(first);
  const header = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "")).join(" | ")} |`).join("\n");
  return [header, sep, body].join("\n");
};

const speedSummaryRow = (label: string, m: SpeedAggregateMetrics) => ({
  scope: label,
  samples: m.sampleCount,
  generation_avg_ms: fmt(m.generationMsAvg),
  seed_avg_docs_per_sec: fmt(m.seedDocsPerSecAvg),
  persisted_avg_kb: fmt(m.persistedBytesAvg / 1024),
  create_avg_ops_per_sec: fmt(m.pointCreateOpsPerSecAvg),
  read_avg_ops_per_sec: fmt(m.pointReadOpsPerSecAvg),
  update_avg_ops_per_sec: fmt(m.pointUpdateOpsPerSecAvg),
  delete_avg_ops_per_sec: fmt(m.pointDeleteOpsPerSecAvg),
  query_avg_ops_per_sec: fmt(m.queryOpsPerSecAvg),
});

const capacitySummaryRow = (label: string, m: CapacityAggregateMetrics) => ({
  scope: label,
  samples: m.sampleCount,
  generation_avg_ms: fmt(m.generationMsAvg),
  seed_avg_docs_per_sec: fmt(m.seedDocsPerSecAvg),
  persisted_avg_kb: fmt(m.persistedBytesAvg / 1024),
  bytes_per_doc_avg: fmt(m.bytesPerDocAvg),
  create_avg_ops_per_sec: fmt(m.pointCreateOpsPerSecAvg),
  read_avg_ops_per_sec: fmt(m.pointReadOpsPerSecAvg),
  update_avg_ops_per_sec: fmt(m.pointUpdateOpsPerSecAvg),
  delete_avg_ops_per_sec: fmt(m.pointDeleteOpsPerSecAvg),
  query_avg_ops_per_sec: fmt(m.queryOpsPerSecAvg),
});

const buildMarkdown = (args: {
  generatedAt: Date;
  totalDurationMs: number;
  speed: SpeedBenchmarkReport;
  capacity: CapacityBenchmarkReport;
}): string => {
  const { generatedAt, totalDurationMs, speed, capacity } = args;

  const speedMatrix = speed.matrixRows.map((row) => ({
    dataset_size: row.datasetSize,
    debounce_delay_ms: row.debounceDelayMs,
    generation_avg_ms: fmt(row.metrics.generationMsAvg),
    seed_avg_docs_per_sec: fmt(row.metrics.seedDocsPerSecAvg),
    create_avg_ops_per_sec: fmt(row.metrics.pointCreateOpsPerSecAvg),
    read_avg_ops_per_sec: fmt(row.metrics.pointReadOpsPerSecAvg),
    update_avg_ops_per_sec: fmt(row.metrics.pointUpdateOpsPerSecAvg),
    delete_avg_ops_per_sec: fmt(row.metrics.pointDeleteOpsPerSecAvg),
    query_avg_ops_per_sec: fmt(row.metrics.queryOpsPerSecAvg),
  }));

  const speedByDelay = speed.byDelay.map((row) => speedSummaryRow(`delay=${row.debounceDelayMs}ms`, row.metrics));
  const speedBySize = speed.bySize.map((row) => speedSummaryRow(`size=${row.datasetSize}`, row.metrics));

  const capacityMatrix = capacity.matrixRows.map((row) => ({
    dataset_size: row.datasetSize,
    debounce_delay_ms: row.debounceDelayMs,
    generation_avg_ms: fmt(row.metrics.generationMsAvg),
    seed_avg_docs_per_sec: fmt(row.metrics.seedDocsPerSecAvg),
    persisted_avg_kb: fmt(row.metrics.persistedBytesAvg / 1024),
    bytes_per_doc_avg: fmt(row.metrics.bytesPerDocAvg),
    create_avg_ops_per_sec: fmt(row.metrics.pointCreateOpsPerSecAvg),
    read_avg_ops_per_sec: fmt(row.metrics.pointReadOpsPerSecAvg),
    update_avg_ops_per_sec: fmt(row.metrics.pointUpdateOpsPerSecAvg),
    delete_avg_ops_per_sec: fmt(row.metrics.pointDeleteOpsPerSecAvg),
    query_avg_ops_per_sec: fmt(row.metrics.queryOpsPerSecAvg),
  }));

  const capacityByDelay = capacity.byDelay.map((row) => capacitySummaryRow(`delay=${row.debounceDelayMs}ms`, row.metrics));
  const capacityBySize = capacity.bySize.map((row) => capacitySummaryRow(`size=${row.datasetSize}`, row.metrics));

  const overviewRows = [
    {
      item: "Report generated at",
      value: generatedAt.toISOString(),
    },
    {
      item: "Total benchmark duration",
      value: formatMs(totalDurationMs),
    },
    {
      item: "Speed benchmark duration",
      value: formatMs(speed.durationMs),
    },
    {
      item: "Capacity benchmark duration",
      value: formatMs(capacity.durationMs),
    },
    {
      item: "Runtime",
      value: speed.environment.runtime,
    },
    {
      item: "Platform",
      value: speed.environment.platform,
    },
    {
      item: "Persistence condition",
      value: speed.environment.persistence,
    },
  ];

  const speedConfigRows = [
    { key: "sizes", value: speed.config.sizes.join(", ") },
    { key: "debounceDelays(ms)", value: speed.config.debounceDelays.join(", ") },
    { key: "rounds", value: speed.config.rounds },
    { key: "warmup", value: speed.config.warmup },
    { key: "smallOps", value: speed.config.smallOps },
    { key: "queryLimit", value: speed.config.queryLimit },
  ];

  const capacityConfigRows = [
    { key: "sizes", value: capacity.config.sizes.join(", ") },
    { key: "debounceDelays(ms)", value: capacity.config.debounceDelays.join(", ") },
    { key: "rounds", value: capacity.config.rounds },
    { key: "warmup", value: capacity.config.warmup },
    { key: "smallOps", value: capacity.config.smallOps },
    { key: "queryLimit", value: capacity.config.queryLimit },
  ];

  return [
    "# Memongo Performance Report",
    "",
    "## 1. Overview",
    "",
    toTable(overviewRows),
    "",
    "## 2. Test Conditions",
    "",
    "- Environment: Node.js runtime.",
    "- Persistence adapter: custom adapter backed by local JSON files in .tmp/test/performance/**.",
    "- Read persistence behavior: each round starts by reading JSON from local file and parsing to object.",
    "- Write persistence behavior: each write persists the entire in-memory database snapshot via fs.writeFileSync(JSON.stringify(data)).",
    "- Durability model in this benchmark: write operations apply in memory immediately; db.flush() is used to wait for all pending asynchronous persistence writes.",
    "",
    "## 3. Metric Definitions (Detailed)",
    "",
    "- dataset generation time: time used to construct synthetic in-memory seed dataset objects (Array.from) before inserting to Memongo.",
    "- seed insert and flush: time for bulk initial load into collection users (create of baseline documents) plus one db.flush() to ensure persistence completes.",
    "- seed docs/s: throughput of baseline loading, computed as seed document count divided by seed insert and flush time.",
    "- persisted size after seed: JSON file size after seed load and flush, representing storage footprint under this persistence adapter.",
    "- bytes per doc (capacity report): persisted size divided by seed document count; a rough storage efficiency indicator under current serialization and schema.",
    "- point create ops/s: throughput of small-scale create operations that insert new documents into existing users collection, then flush.",
    "- point read ops/s: throughput of small-scale point reads by specific _id from existing seed documents.",
    "- point update ops/s: throughput of small-scale point updates by _id (score/tag update), then flush.",
    "- point delete ops/s: throughput of small-scale point deletes by _id for docs created in this round, then flush.",
    "- small query ops/s: throughput of repeated filtered + ordered + limited queries (where + orderBy + limit + get).",
    "- debounceDelay(ms): Memongo write debounce delay configured at database creation; larger values delay persistence write scheduling and can affect flush-visible timing and throughput.",
    "",
    "## 4. Speed Benchmark",
    "",
    "### 4.1 Configuration",
    "",
    toTable(speedConfigRows),
    "",
    "### 4.2 Global Summary",
    "",
    toTable([speedSummaryRow("speed-global", speed.global)]),
    "",
    "### 4.3 Summary by Debounce Delay",
    "",
    toTable(speedByDelay),
    "",
    "### 4.4 Summary by Dataset Size",
    "",
    toTable(speedBySize),
    "",
    "### 4.5 Detailed Matrix (size x delay)",
    "",
    toTable(speedMatrix),
    "",
    "## 5. Capacity Benchmark",
    "",
    "### 5.1 Configuration",
    "",
    toTable(capacityConfigRows),
    "",
    "### 5.2 Global Summary",
    "",
    toTable([capacitySummaryRow("capacity-global", capacity.global)]),
    "",
    "### 5.3 Summary by Debounce Delay",
    "",
    toTable(capacityByDelay),
    "",
    "### 5.4 Summary by Dataset Size",
    "",
    toTable(capacityBySize),
    "",
    "### 5.5 Detailed Matrix (size x delay)",
    "",
    toTable(capacityMatrix),
    "",
    "## 6. Human Interpretation Guide",
    "",
    "- If point create/update/delete ops/s drops sharply at larger debounceDelay, that means flush wait cost dominates small writes under this persistence strategy.",
    "- If point read ops/s remains stable across debounceDelay, it confirms debounceDelay mainly affects persistence path, not pure in-memory point lookup.",
    "- If bytes per doc grows with dataset size, check data shape drift or JSON overhead effects; it should usually stay relatively stable for fixed schema.",
    "- Compare speed-global and capacity-global together: speed focuses on operational responsiveness, capacity focuses on storage footprint and scale behavior.",
    "",
  ].join("\n");
};

async function main() {
  const startedAt = performance.now();

  const speed = await testSpeed();
  console.log("\n\n\n");
  const capacity = await testCapacity();

  const totalDurationMs = performance.now() - startedAt;
  const generatedAt = new Date();

  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const stamp = generatedAt
    .toISOString()
    .replace(/[:-]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace("T", "-");

  const fileName = `perf-report-${stamp}.md`;
  const latestName = "perf-report-latest.md";

  const markdown = buildMarkdown({ generatedAt, totalDurationMs, speed, capacity });

  const fullPath = path.join(REPORT_DIR, fileName);
  const latestPath = path.join(REPORT_DIR, latestName);

  fs.writeFileSync(fullPath, markdown, "utf8");
  fs.writeFileSync(latestPath, markdown, "utf8");

  console.log("\nMarkdown report written:");
  console.log(fullPath);
  console.log(latestPath);
  console.log(`Total benchmark duration: ${formatMs(totalDurationMs)}`);
  console.log(`Report generated at: ${generatedAt.toISOString()}`);
}

main().catch((error) => {
  console.error("Performance tests failed:", error);
  process.exitCode = 1;
});
