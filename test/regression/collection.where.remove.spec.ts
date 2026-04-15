import type {
  CollectionContent,
  CollectionQueryOptions,
} from "../../src/public-types.js";

import { MemongoCollection } from "../../src/core/memongo/collection.js";
import { query } from "../../src/operators/query.js";
import { expect } from "chai";

describe(`(regression test) ${MemongoCollection.name}.where(...).remove()`, function () {
  function createFakeRoot() {
    return {
      writeCalls: 0,

      write() {
        this.writeCalls++;
      },
    };
  }

  function createCollection(
    content: CollectionContent = {},
    queryOptions: CollectionQueryOptions = {},
  ) {
    const root = createFakeRoot();
    const collection = new MemongoCollection(root, content, queryOptions);
    return { root, collection };
  }

  it("should remove documents matching the condition", function () {
    const { collection } = createCollection({
      "1": { name: "Alice", age: 30 },
      "2": { name: "Bob", age: 25 },
      "3": { name: "Charlie", age: 35 },
    });

    collection.where({ _id: query.in(["1", "3"]) }).remove();
    expect(collection.get()).to.deep.equal([{ _id: "2", name: "Bob", age: 25 }]);
  });
});
