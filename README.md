<div align="center">

<img src="docs/assets/logo.png" width="120" alt="Memongo Logo"/>

# Memongo

**English** · [简体中文](./README_zh-CN.md)

![license](https://img.shields.io/badge/license-GPLv3-blue)
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

Licensed under [GNU GPL v3](https://github.com/SinbereeGit/Memongo/LICENCE).
