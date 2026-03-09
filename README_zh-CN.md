<div align="center">

# Memongo

![license](https://img.shields.io/badge/license-GPLv3-blue)
![javascript](https://img.shields.io/badge/language-JavaScript-yellow)
![repo size](https://img.shields.io/github/repo-size/SinbereeGit/memongo)
![npm version](https://img.shields.io/npm/v/memongo)
![stars](https://img.shields.io/github/stars/SinbereeGit/memongo)

[English](./README.md) · **简体中文**

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

基于 [GNU GPL v3](https://github.com/SinbereeGit/Memongo/LICENCE) 开源许可发布。
