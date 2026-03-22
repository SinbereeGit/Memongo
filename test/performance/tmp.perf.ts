import { createDatabase, command } from "../../src/index.js";
import fs from "fs";

const _ = command;

const testFilePath = ".tmp/test/performance/db.json";

async function measure(name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  await Promise.resolve(fn());
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)} ms`);
}

async function main() {
  const db = createDatabase({
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
  });

  await db.init();
  const users = db.createCollection("users");

  const data = Array.from({ length: 10_000 }, (_, i) => ({
    test_id: i,
    age: i % 100,
    active: i % 2 === 0,
  }));

  await measure("insert 10k", async () => {
    for (const item of data) {
      users.add(item);
    }
    await db.flush();
  });

  await measure("query age > 50", async () => {
    users.where({ age: _.gt(50) }).get();
  });
}

main();
