/**
 * Demonstrates Memongo's asynchronous persistence model with a simulated persistence.
 *
 * Key points shown in this example:
 * 1) Database writes are applied to in-memory state synchronously.
 * 2) Persistence writes happen asynchronously in the background.
 * 3) Calling db.flush() waits for all pending persistence writes.
 * 4) Persistence errors are aggregated and thrown when db.flush() is called.
 *
 * This example DOES NOT use real durable storage.
 * It uses a delayed in-memory object only to simulate async persistence behavior.
 */

import { createDatabase } from "memongo";

// Mock persistent state (simulated only, not real storage).
let simulatedPersistentState = {};

// Control whether simulated persistence should fail.
let shouldFailWrites = false;

const db = createDatabase(
  {
    readDatabaseContentFunc: async () => {
      // Deep-clone to mimic persistence read behavior.
      return JSON.parse(JSON.stringify(simulatedPersistentState));
    },
    writeDatabaseContentFunc: async (databaseContent, resolve, reject) => {
      if (shouldFailWrites) {
        setTimeout(() => {
          reject(new Error("Simulated persistence failure"));
        }, 10);
        return;
      }

      setTimeout(() => {
        // Deep-clone to mimic persistence write behavior.
        simulatedPersistentState = JSON.parse(JSON.stringify(databaseContent));
        resolve();
      }, 10); // Simulate async delay of 100ms.
    },
  },
  20,
);

async function demoAsyncPersistenceVisibility() {
  console.log("=== Demo 1: async persistence visibility (simulated) ===");
  console.log(
    "[Notice] Persistence here is mocked and delayed, not real durable storage.\n",
  );

  await db.init();

  const todos = db.createCollection("todos");
  todos.add({ title: "Buy milk", done: false });

  // In-memory update is immediately visible.
  console.log("In-memory right after add:", todos.get());

  // But the simulated persistent state has not been updated yet.
  console.log(
    "Simulated persistence right after add:",
    simulatedPersistentState,
  );

  // Wait until all pending persistence writes complete.
  await db.flush();

  // After flush, simulated persistent state catches up.
  console.log(
    "Simulated persistence after flush:",
    simulatedPersistentState,
    "\n",
  );
}

async function demoFlushThrowsAggregatedErrors() {
  console.log("=== Demo 2: flush aggregates persistence errors ===");

  await db.init();

  let logs = db.collection("logs");
  if (!logs) logs = db.createCollection("logs");

  shouldFailWrites = true;

  // These writes change in-memory state immediately, but simulated persistence will fail when writing to persistence happens.
  logs.add({ level: "info", message: "first write" });
  logs.add({ level: "warn", message: "second write" });
  logs.add({ level: "error", message: "third write" });

  // Here should be only one error in the aggregate error.
  try {
    await db.flush();
  } catch (err) {
    if (err instanceof AggregateError) {
      console.log(
        `flush() threw AggregateError with ${err.errors.length} error(s).`,
      );
      for (const [index, e] of err.errors.entries()) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`  #${index + 1}: ${message}`);
      }
    } else {
      console.log("flush() threw unexpected error:", err);
    }
  } finally {
    shouldFailWrites = false;
  }
}

async function demoFlushThrowsAggregatedErrorsContainMoreThanOneError() {
  console.log("=== Demo 3: flush aggregates multiple persistence errors ===");

  await db.init();

  let logs = db.collection("logs");
  if (!logs) logs = db.createCollection("logs");

  shouldFailWrites = true;

  // These writes change in-memory state immediately, but simulated persistence will fail when writing to persistence happens.
  logs.add({ level: "info", message: "first write" });
  await new Promise(resolve => setTimeout(resolve, 200));
  logs.add({ level: "warn", message: "second write" });
  await new Promise(resolve => setTimeout(resolve, 200));
  logs.add({ level: "error", message: "third write" });

  // Here should be three errors in the aggregate error.
  try {
    await db.flush();
  } catch (err) {
    if (err instanceof AggregateError) {
      console.log(
        `flush() threw AggregateError with ${err.errors.length} error(s).`,
      );
      for (const [index, e] of err.errors.entries()) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`  #${index + 1}: ${message}`);
      }
    } else {
      console.log("flush() threw unexpected error:", err);
    }
  } finally {
    shouldFailWrites = false;
  }
}

async function main() {
  await demoAsyncPersistenceVisibility();
  await demoFlushThrowsAggregatedErrors();
  await demoFlushThrowsAggregatedErrorsContainMoreThanOneError();
}

await main();
