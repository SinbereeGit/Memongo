# Changelog

## 2.0.1

### Patch Changes

- fix: correct collection.where(...).remove() filtering and add regression test

## 2.0.0

### Major Changes

- Rewrite the codebase in TypeScript and introduce unit tests with Mocha + Chai.
- Redesign the write model:
  - in-memory updates are now applied synchronously
  - persistence writes are now executed asynchronously
  - persistence-related errors are deferred and surfaced via `flush()`

### Minor Changes

- Add performance test.

### Patch Changes

- Add a spec documenting the persistence write order assumption.
- Clarify the persistence model and update async persistence / `flush()` examples.

## 1.0.0 - 2026-03-10

### Major Changes

- Initial release of Memongo
- MongoDB-like API
- In-memory JSON storage
- Dot-notation field access
- Query commands (`gt`, `lt`, `in`, `exists`, etc.)
- Functional updates
- Debounced persistence writes
- Custom persistence layer
- Examples for Node.js, Browser, and WeChat Mini Program
