const fs = require("fs");
const { MemoryJSONDB } = require("../memongo");

const _ = MemoryJSONDB.command;

const db = new MemoryJSONDB(
  async () => {
    try {
      return JSON.parse(fs.readFileSync("./db.json", "utf8"));
    } catch {
      return {};
    }
  },
  async (data, resolve, reject) => {
    try {
      fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
      resolve();
    } catch (err) {
      reject(err);
    }
  },
);

async function main() {
  await db.init();

  let users = db.collection("users");
  if (!users) users = await db.createCollection("users");

  await users.add({
    data: { name: "Alice", age: 20 },
  });

  await users.add({
    data: { name: "Bob", age: 25 },
  });

  const res = users
    .where({
      age: _.gt(21),
    })
    .get();

  console.log(res.data);
}

main();
