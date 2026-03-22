<div align="center">

<img src="assets/logo.png" width="120" alt="Memongo Logo"/>

# Memongo

![license](https://img.shields.io/badge/license-MIT-blue)
![javascript](https://img.shields.io/badge/language-JavaScript-yellow)
![repo size](https://img.shields.io/github/repo-size/SinbereeGit/memongo)
![npm version](https://img.shields.io/npm/v/memongo)
![stars](https://img.shields.io/github/stars/SinbereeGit/memongo)

</div>

**Memongo** is a lightweight in-memory JSON database with **MongoDB-like API** and **pluggable persistence**.

By delegating persistence to user-defined read/write functions, Memongo stays fully environment-agnostic—working out of the box in environments including browsers, Node.js, and WeChat Mini Programs.

## ✨ Features

- 🧠 MongoDB-like query syntax via `command`
- 🔄 Chainable API for filtering, sorting, pagination
- 💾 Pluggable persistence (Node.js, browser, wechat-miniprogram, custom)
- ⚡ Lightweight (in-memory by default)
- 🧩 Works in both TypeScript and JavaScript
- 🕒 No dependencies

## 📦 Installation

```bash
npm install memongo
```

## 🚀 Quick Start

> 💡 All [examples] in this repository are written in TypeScript,
> but they work in JavaScript **without any changes**.

```typescript
import { createDatabase } from "memongo";

async function main() {
  // 1) Create an in-memory database (no persistence argument).
  const db = createDatabase();
  await db.init();

  // 2) Create or get a collection.
  let todos = db.collection("todos");
  if (!todos) {
    todos = db.createCollection("todos");
  }

  // 3) Add documents.
  const { _id: buyMilkId } = todos.add({
    title: "Buy milk",
    done: false,
    priority: 2,
  });

  todos.add({
    title: "Read Memongo docs",
    done: false,
    priority: 1,
  });

  console.log("After add:", todos.get());

  // 4) Read one document by id.
  const buyMilk = todos.doc(buyMilkId).get();
  console.log("One doc:", buyMilk);

  // 5) Update one document.
  todos.doc(buyMilkId).update({
    done: true,
  });
  console.log("After doc.update:", todos.get());

  // 6) Remove one document.
  todos.doc(buyMilkId).remove();
  console.log("After doc.remove:", todos.get());

  // 7) Remove all documents in the collection.
  todos.remove();
  console.log("After collection.remove:", todos.get());
}

await main();
```

## 📚 Documentation

👉 [Full API documentation](https://sinbereegit.github.io/Memongo/)

Usage Examples:

- In-memory usage
- Query commands
- Update commands
- Custom persistence (node, browser, wechat-miniprogram)

➡️ See [examples]

## 🌍 Environment Support

- ✅ Node.js
- ✅ Browser
- ✅ WeChat Mini Program
- ✅ Any JavaScript runtime (via adapter)

## ⚠️ Notes

ESM only → use `import`

## 🧱 Limitations

- The entire database is rewritten during persistence
- Not suitable for large datasets
- No indexing support yet

## 🙏 Acknowledgements

Thanks to the following open-source projects:

- [MpLocalDB](https://github.com/jin-yufeng/MpLocalDB)

## 📄 License

[MIT](./LICENSE)

[examples]: https://github.com/SinbereeGit/Memongo/tree/main/examples
