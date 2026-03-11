<div align="center">

<img src="docs/assets/logo.png" width="120" alt="Memongo Logo"/>

# Memongo

[English](./README.md) · **简体中文**

![license](https://img.shields.io/badge/license-MIT-blue)
![javascript](https://img.shields.io/badge/language-JavaScript-yellow)
![repo size](https://img.shields.io/github/repo-size/SinbereeGit/memongo)
![npm version](https://img.shields.io/npm/v/memongo)
![stars](https://img.shields.io/github/stars/SinbereeGit/memongo)

<img src="docs/assets/banner.png" width="600" alt="Memongo Banner"/>

</div>

一个**极简的、类 MongoDB 的内存 JSON 数据库**，支持可插拔的持久化机制。

Memongo 是一个轻量级 JavaScript 数据库，在内存中存储 JSON 数据，并提供类似 MongoDB 的 API 用于查询和操作数据。

它被设计为**简单、可嵌入、与运行环境无关**。数据持久化通过用户提供的读写函数实现，因此可以运行在 **浏览器、Node.js、微信小程序等环境中**。

---

## 特性

- 类 MongoDB 的查询 API
- 基于内存的 JSON 存储
- 可自定义持久化层
- 支持点路径字段访问（`"user.profile.age"`）
- 支持函数式更新
- 查询指令（`gt`、`lt`、`in`、`exists` 等）
- 防抖持久化写入
- 无依赖

---

## 安装

如果可以使用 npm：

```bash
npm install memongo
```

或者

直接将源码文件复制到你的项目中即可。

---

## 快速示例

> 其他示例 (在诸如 _浏览器_, _node.js_, _微信小程序_ 环境中), 见目录 [`examples`](./examples).

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

## 创建数据库

```javascript
const db = new MemoryJSONDB(getJSONObj, writeJSONObj);
await db.init();
```

### getJSONObj

一个返回**持久化 JSON 对象**的函数。

### writeJSONObj

一个将 JSON 对象写入持久化存储的函数，使用 `resolve` 和 `reject` 处理成功和失败情况：

- `resolve` 表示写入成功
- `reject` 表示写入失败

---

## 集合（Collections）

创建集合：

```javascript
const users = await db.createCollection("users");
```

获取已有集合：

```javascript
const users = db.collection("users");
```

---

## 插入文档

```javascript
await users.add({
  data: {
    name: "Alice",
    age: 25,
  },
});
```

自定义 `_id`：

```javascript
await users.add({
  data: {
    _id: "user1",
    name: "Alice",
  },
});
```

---

## 查询文档

```javascript
users
  .where({
    age: 20,
  })
  .get();
```

嵌套字段：

```javascript
users.where({
  "profile.age": 20,
});
```

---

## 查询指令

可用指令：

- `command.eq(value)`
- `command.neq(value)`
- `command.gt(value)`
- `command.gte(value)`
- `command.lt(value)`
- `command.lte(value)`
- `command.in(array)`
- `command.nin(array)`
- `command.exists(boolean)`

示例：

```javascript
users.where({
  age: command.gt(18),
});
```

---

## 排序

```javascript
users.orderBy("age", "asc").get();
```

多字段排序：

```javascript
users.orderBy("age", "asc").orderBy("name", "desc").get();
```

---

## Limit 和 Skip

```javascript
users.skip(10).limit(5).get();
```

---

## 更新

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

嵌套字段更新：

```javascript
await users.doc("user1").update({
  data: {
    "profile.age": 30,
  },
});
```

---

## 删除

删除一个文档：

```javascript
users.doc("user1").remove();
```

清空集合：

```javascript
await users.remove();
```

---

## 示例：微信小程序持久化

通过这种方式，只要避免访问特定的 key `"localDB"`，仍然可以使用 `wx.getStorage` 和 `wx.setStorage`。数据库的最大容量为 1 MB，因为微信小程序对每个 key 只允许 1 MB 的存储空间（具体可参考 [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)）。

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

以下是一种方案，可充分利用整个 10 MB 的本地存储。在这种方式下，本地存储的访问必须仅通过此数据库 API 进行，否则可能会出现不可预期的结果。

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

要实现上述任一方法，最好像下面示例那样，在一个单独的 JS 文件中（例如 `localDB.js`）进行封装，并始终通过该文件与数据库进行交互。

```javascript
// 在 localDB.js 文件中

const { MemoryJSONDB, LOCALDB_ERROR_TYPES } = require("../memongo"); // 或者使用正确的 require 路径

// 上述两种方式中的任意一种
// ...

module.exports = {
  db,
  command: MemoryJSONDB.command,
  LOCALDB_ERROR_TYPES,
};
```

通过这种方式，可以确保数据库只有一个实例，从而避免因运行多个实例而未仔细处理数据一致性而可能产生的不一致问题。

---

## 限制

- 持久化时会**重写整个数据库**
- 不适合大型数据集
- 目前**尚未支持索引**

---

## 致谢

感谢以下开源项目:

- [MpLocalDB](https://github.com/jin-yufeng/MpLocalDB)

---

## 许可证

> 这个项目之前采用 GPL-3.0 许可，现已重新授权为 MIT 许可。

基于 [MIT](https://github.com/SinbereeGit/Memongo/LICENCE) 开源许可发布。
