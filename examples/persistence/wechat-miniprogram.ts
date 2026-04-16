/**
 * Demonstrates how to persist the database content in a WeChat Mini Program.
 *
 * Environment:
 *   - WeChat Mini Program (wx environment)
 *
 * Description:
 *   - Implements a persistence adapter using wx.setStorage / wx.getStorage
 *   - Two ways of using wx.setStorage / wx.getStorage are provided:
 *    1) Storing the entire database content under a single key (in this case, "memongo-demo"). This is simpler to implement but has a maximum size limit of 1 MB due to WeChat Mini Program's storage limitations.
 *    2) Storing each collection in the database as a separate key in local storage. This allows for a larger total storage capacity (up to 10 MB), but requires that all access to local storage be done through this database API to avoid conflicts.
 */

import { createDatabase, command } from "memongo";

const _ = command;

// Way 1: In this way, one can still use wx.getStorage and wx.setStorage as long as they avoid accessing the specific key "memongo-demo". The maximum size of the database is then 1 MB, as WeChat Mini Program allows only 1 MB of storage per key (for details about this, refer to the [official WeChat Mini Program documentation](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)).
const db = createDatabase({
  readDatabaseContentFunc: async () => {
    try {
      return (await wx.getStorage({ key: "memongo-demo" })).data;
    } catch {
      return {};
    }
  },
  writeDatabaseContentFunc: async (jsonObj, resolve, reject) => {
    wx.setStorage({
      key: "memongo-demo",
      data: jsonObj,
      success: resolve,
      fail: reject,
    });
  },
});

// // Way 2: The following is a solution to fully utilize the entire 10 MB of local storage. In this approach, access to local storage must be restricted solely to this database API; otherwise, unpredictable results may occur.
// const db = createDatabase({
//   readDatabaseContentFunc: async () => {
//     const memoryJSONDB = Object.create(Object.prototype);
//     await Promise.all(
//       (await wx.getStorageInfo()).keys.map(async (key: string) => {
//         memoryJSONDB[key] = (await wx.getStorage({ key })).data;
//       }),
//     );
//     return memoryJSONDB;
//   },
//   writeDatabaseContentFunc: async (jsonObj, resolve, reject) => {
//     Promise.all(
//       Object.keys(jsonObj).map(async (key: string) => {
//         await wx
//           .setStorage({
//             key: key,
//             data: jsonObj[key],
//           })
//           .then(resolve)
//           .catch(reject);
//       }),
//     );
//   },
// });

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
