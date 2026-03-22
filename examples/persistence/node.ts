/**
 * Demonstrates how to persist the database content to a JSON file using Node.js.
 *
 * Environment:
 *   - Node.js (v18+)
 *
 * Description:
 *   - Implements a simple file-based persistence adapter using fs/promises
 *
 * Notes:
 *   - This example will create a `db.json` file in the current directory
 */

import fs from "fs"; // For TypeScript: install @types/node and add this to your tsconfig.json
import { createDatabase, command } from "memongo";

const _ = command;

const db = createDatabase({
  readDatabaseContentFunc: async () => {
    try {
      return JSON.parse(fs.readFileSync("./db.json", "utf8"));
    } catch {
      return {};
    }
  },
  writeDatabaseContentFunc: async (data, resolve, reject) => {
    try {
      fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
      resolve();
    } catch (err) {
      reject(err);
    }
  },
});

async function main() {
  await db.init();

  let users = db.collection("users");
  if (!users) users = db.createCollection("users");

  users.add({ name: "Alice", age: 20 });

  users.add({ name: "Bob", age: 25 });

  const res = users
    .where({
      age: _.gt(21),
    })
    .get();

  console.log(res);
}

await main();
