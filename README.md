<div align="center">

<img src="docs/assets/logo.png" width="120" alt="Memongo Logo"/>

# Memongo

**English** · [简体中文](./README_zh-CN.md)

![license](https://img.shields.io/badge/license-MIT-blue)
![javascript](https://img.shields.io/badge/language-JavaScript-yellow)
![repo size](https://img.shields.io/github/repo-size/SinbereeGit/memongo)
![npm version](https://img.shields.io/npm/v/memongo)
![stars](https://img.shields.io/github/stars/SinbereeGit/memongo)

<img src="docs/assets/banner.png" width="600" alt="Memongo Banner"/>

</div>

A minimal MongoDB-like in-memory JSON database with pluggable persistence.

Memongo is a lightweight JavaScript database that stores JSON data in memory and provides a MongoDB-style API for querying and manipulating data.

It is designed to be simple, embeddable, and environment-agnostic. Persistence is handled by user-provided read/write functions, allowing it to run in environments such as browsers, Node.js, or WeChat Mini Programs.

---

## Features

- MongoDB-like query API
- In-memory JSON storage
- Custom persistence layer
- Dot-notation field access (`"user.profile.age"`)
- Functional updates
- Query commands (`gt`, `lt`, `in`, `exists`, etc.)
- Debounced persistence writes
- No dependencies

---

## Installation

Through npm if available:

```bash
npm install memongo
```

Or

simply copy the source file into your project.

---

## Quick Example

> Other example (in environment like _browser_ or _node.js_ or _wechat-minipragram_), refer to directory [`examples`](./examples).

```javascript
const { MemoryJSONDB } = require("memongo");

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

await db.init();

const users = await db.createCollection("users");

await users.add({
  data: {
    name: "Tom",
    age: 20,
  },
});

const result = users
  .where({
    age: _.gt(18),
  })
  .get();

console.log(result.data);
```

---

## Creating a Database

```javascript
const db = new MemoryJSONDB(getJSONObj, writeJSONObj);
await db.init();
```

### getJSONObj

A function that returns the persisted JSON object.

### writeJSONObj

A function that writes the JSON object to persistent storage, using `resolve` and `reject` to handle success and failure cases respectively (`resolve` indicates the write operation completed successfully, while `reject` indicates it failed).

---

## Collections

Create a collection:

```javascript
const users = await db.createCollection("users");
```

Get an existing collection:

```javascript
const users = db.collection("users");
```

---

## Insert Documents

```javascript
await users.add({
  data: {
    name: "Alice",
    age: 25,
  },
});
```

Custom `_id`:

```javascript
await users.add({
  data: {
    _id: "user1",
    name: "Alice",
  },
});
```

---

## Query Documents

```javascript
users
  .where({
    age: 20,
  })
  .get();
```

Nested fields:

```javascript
users.where({
  "profile.age": 20,
});
```

---

## Query Commands

Available commands:

- `command.eq(value)`
- `command.neq(value)`
- `command.gt(value)`
- `command.gte(value)`
- `command.lt(value)`
- `command.lte(value)`
- `command.in(array)`
- `command.nin(array)`
- `command.exists(boolean)`

Example:

```javascript
users.where({
  age: command.gt(18),
});
```

---

## Sorting

```javascript
users.orderBy("age", "asc").get();
```

Multiple fields:

```javascript
users.orderBy("age", "asc").orderBy("name", "desc").get();
```

---

## Limit and Skip

```javascript
users.skip(10).limit(5).get();
```

---

## Update

```javascript
await users
  .where({
    age: 20,
  })
  .update({
    data: {
      age: (age) => age + 1,
    },
  });
```

Nested update:

```javascript
await users.doc("user1").update({
  data: {
    "profile.age": 30,
  },
});
```

---

## Delete

Remove a document:

```javascript
users.doc("user1").remove();
```

Clear a collection:

```javascript
await users.remove();
```

---

## Example: WeChat Mini Program Persistence

In this way, one can still use `wx.getStorage` and `wx.setStorage` as long as they avoid accessing the specific key `"localDB"`. The maximum size of the database is then 1 MB, as WeChat Mini Program allows only 1 MB of storage per key (for details about this, refer to the [official WeChat Mini Program documentation](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)).

```javascript
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
```

The following is a solution to fully utilize the entire 10 MB of local storage. In this approach, access to local storage must be restricted solely to this database API; otherwise, unpredictable results may occur.

```javascript
const db = new MemoryJSONDB(
  async () => {
    const memoryJSONDB = {};
    await Promise.all(
      (await wx.getStorageInfo()).keys.map(async (key) => {
        memoryJSONDB[key] = (await wx.getStorage({ key })).data;
      }),
    );
    return memoryJSONDB;
  },
  async (jsonObj, resolve, reject) => {
    Promise.all(
      Object.keys(jsonObj).map(async (key) => {
        await wx
          .setStorage({
            key: key,
            data: jsonObj[key],
          })
          .then(resolve)
          .catch(reject);
      }),
    );
  },
);
```

To implement either of the above approaches, it is best to do the following wrapping in a separate JS file (e.g., `localDB.js`) as demonstrated below, and always interact with the database through this file.

```javascript
// In localDB.js file

const { MemoryJSONDB, LOCALDB_ERROR_TYPES } = require("../memongo"); // Or the right path to require

// Either of the above two way
// ...

module.exports = {
  db,
  command: MemoryJSONDB.command,
  LOCALDB_ERROR_TYPES,
};
```

In this way, one can ensure that there is only one instance of the database, thereby avoiding any inconsistency issues that might arise from running multiple instances without carefully handling data consistency.

---

## Limitations

- The entire database is rewritten during persistence
- Not suitable for large datasets
- No indexing support yet

---

## Acknowledgements

Thanks to the following open-source projects:

- [MpLocalDB](https://github.com/jin-yufeng/MpLocalDB)

---

## License

> This project was previously licensed under GPL-3.0 and is now relicensed under MIT.

Licensed under [MIT](https://github.com/SinbereeGit/Memongo/LICENCE).
