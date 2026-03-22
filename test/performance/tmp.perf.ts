import { createDatabase, command } from "../../src/index.js";
import fs from "fs";
import path from "path";

const _ = command;

const testFilePath = ".tmp/test/performance/db.json";

async function measure(name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  await Promise.resolve(fn());
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)} ms`);
}

async function singleTest(delay = 200, amount = 100_000) {
  const testDirPath = path.dirname(testFilePath);
  if (!fs.existsSync(testDirPath)) {
    fs.mkdirSync(testDirPath, { recursive: true });
  }

  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  const db = createDatabase(
    {
      readDatabaseContentFunc: async () => {
        try {
          return JSON.parse(fs.readFileSync(testFilePath, "utf8"));
        } catch {
          return {};
        }
      },
      writeDatabaseContentFunc: async (data, resolve, reject) => {
        try {
          fs.writeFileSync(testFilePath, JSON.stringify(data, null, 2));
          resolve();
        } catch (err) {
          reject(err);
        }
      },
    },
    delay,
  );

  await db.init();
  const users = db.createCollection("users");

  const data = Array.from({ length: amount }, (_, i) => ({
    test_id: i,
    age: i % 100,
    active: i % 2 === 0,
  }));

  console.log(`\n=== Test: delay ${delay}ms, amount ${amount.toLocaleString()} ===`);

  await measure("insert (sync)", async () => {
    for (const item of data) {
      users.add(item);
    }
  });

  await measure(
    "insert (persist wait)",
    async () => {
      await db.flush();
    },
  );

  await measure("query", async () => {
    users.where({ age: _.gt(50) }).orderBy("age").limit(50).get();
  });

  console.log(`---------------------------------------------\n\n`);
}

async function main() {
  const delays = [0, 10, 50, 200];
  const amounts = [10_000, 100_000];
  const testCases = amounts.flatMap((amount) =>
    delays.map((delay) => ({ delay, amount })),
  );

  for (const { delay, amount } of testCases) {
    await singleTest(delay, amount);
  }
}

main();
