const { MemoryJSONDB } = require("../memongo");

const _ = MemoryJSONDB.command;

const db = new MemoryJSONDB(
  async () => {
    try {
      return (await wx.getStorage({ key: "localDB" })).data;
    } catch {
      return {};
    }
  },
  async (jsonObj, resolve, reject) => {
    wx.setStorage({
      key: "localDB",
      data: jsonObj,
      success: resolve,
      fail: reject,
    });
  },
);

async function initDB() {
  await db.init();

  let users = db.collection("users");
  if (!users) users = await db.createCollection("users");

  await users.add({
    data: { name: "MiniUser", age: 18 },
  });

  const res = users
    .where({
      age: _.gte(18),
    })
    .get();

  console.log(res.data);
}

initDB();
