/**
 * Demonstrates how to persist the database content using browser localStorage.
 *
 * Environment:
 *   - Browser (Chrome, Edge, Firefox, etc.)
 *
 * Description:
 *   - Implements a persistence adapter backed by localStorage
 *
 * Notes:
 *   - Data is stored under the key "memongo-demo"
 */

import { createDatabase, command } from "memongo";

const _ = command;

const db = createDatabase({
  readDatabaseContentFunc: async () =>
    JSON.parse(localStorage.getItem("memongo-demo") || "{}"),
  writeDatabaseContentFunc: async (data, resolve, reject) => {
    try {
      localStorage.setItem("memongo-demo", JSON.stringify(data));
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

main();
