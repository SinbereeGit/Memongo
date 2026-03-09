import { MemoryJSONDB } from "../memongo";

const _ = MemoryJSONDB.command;

const db = new MemoryJSONDB(
  async () => JSON.parse(localStorage.getItem("db") || "{}"),
  async (data, resolve, reject) => {
    try {
      localStorage.setItem("db", JSON.stringify(data));
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
    data: { name: "Tom", age: 30 },
  });

  const res = users
    .where({
      age: _.gt(18),
    })
    .get();

  console.log(res.data);
}

main();
