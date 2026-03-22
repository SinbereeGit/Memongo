import type {
  CollectionContent,
  CollectionQueryOptions,
} from "../../../src/types/collection.js";

import { expect } from "chai";
import { MemongoCollection } from "../../../src/core/memongo/collection.js";
import { MemongoDocument } from "../../../src/core/memongo/document.js";
import { MemongoQueryCommand } from "../../../src/core/memongo/query-command.js";
import {
  DocumentAlreadyExistsError,
  DocumentNotExistsError,
  IncomparableValueError,
} from "../../../src/errors.js";
import { expectRejects } from "../../utils/expect-rejects.js";
import { REMOVE } from "../../../src/core/json/json-object-ops.js";

describe(`${MemongoCollection.name}`, function () {
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

  describe(`${MemongoCollection.prototype.add.name}`, function () {
    it("adds the document to the collection and delegates writing to root", async function () {
      const { collection, root } = createCollection();

      const id = (
        await collection.add({
          name: "Tom",
        })
      )._id;

      expect(collection.get()).to.deep.equal([{ _id: id, name: "Tom" }]);
      expect(root.writeCalls).to.equal(1);
    });

    it("uses _id if provided, otherwise generates one", async function () {
      const { collection, root } = createCollection();

      const res = await collection.add({
        _id: "dqal",
        name: "Tom",
      });

      expect(res).to.deep.equal({ _id: "dqal" });
      expect(collection.get()).to.deep.equal([{ _id: "dqal", name: "Tom" }]);

      const id = (
        await collection.add({
          name: "Jack",
        })
      )._id;

      expect(id).to.be.a("string");
      expect(id).to.not.equal("");
      expect(collection.get()).to.deep.equal([
        { _id: "dqal", name: "Tom" },
        { _id: id, name: "Jack" },
      ]);

      expect(root.writeCalls).to.equal(2);
    });

    describe("is transactional", function () {
      it(`throws ${DocumentAlreadyExistsError.name} if provided _id already exists, and nothing changes`, async function () {
        const { collection, root } = createCollection({
          udr1: { name: "Old Tom" },
        });

        await expectRejects(
          () =>
            collection.add({
              _id: "udr1",
              name: "New Tom",
            }),
          DocumentAlreadyExistsError,
        );

        expect(collection.get()).to.deep.equal([
          { _id: "udr1", name: "Old Tom" },
        ]);
        expect(root.writeCalls).to.equal(0);
      });
    });
  });

  describe(`${MemongoCollection.prototype.doc.name}`, function () {
    it(`returns a ${MemongoDocument.name} for the specified id`, function () {
      const { collection } = createCollection({
        doc1: { name: "Tom" },
      });
      const doc = collection.doc("doc1");
      expect(doc).to.be.instanceOf(MemongoDocument);
      expect(doc.get()).to.deep.equal({ _id: "doc1", name: "Tom" });
    });

    it(`throws ${DocumentNotExistsError.name} if the document does not exist`, function () {
      const { collection } = createCollection();

      expect(() => collection.doc("missing")).to.throw(DocumentNotExistsError);
    });
  });

  describe(`${MemongoCollection.prototype.where.name}`, function () {
    it("returns a new collection with documents passing query conditions", function () {
      const { collection } = createCollection({
        a: { name: "Tom" },
        b: { name: "Jack" },
      });

      const filtered = collection.where({ name: "Tom" });

      expect(filtered).to.not.equal(collection);
      expect(filtered.get()).to.deep.equal([{ _id: "a", name: "Tom" }]);
    });

    describe("supports WhereConditions", function () {
      it("supports _id field conditions especially", function () {
        const { collection } = createCollection({
          a: { name: "Tom" },
          b: { name: "Jack" },
        });
        expect(
          collection
            .where({
              _id: "a",
            })
            .get(),
        ).to.deep.equal([{ _id: "a", name: "Tom" }]);
      });

      it("supports direct value conditions", function () {
        const { collection } = createCollection({
          a: { name: "Tom", age: 20 },
          b: { name: "Jack", age: 18 },
        });

        expect(
          collection
            .where({
              name: "Tom",
            })
            .get(),
        ).to.deep.equal([{ _id: "a", name: "Tom", age: 20 }]);
      });

      it("supports dot notation for nested fields", function () {
        const { collection } = createCollection({
          a: { profile: { name: "Tom" } },
          b: { profile: { name: "Jack" } },
        });
        expect(
          collection
            .where({
              "profile.name": "Tom",
            })
            .get(),
        ).to.deep.equal([{ _id: "a", profile: { name: "Tom" } }]);
      });

      it("supports nested object conditions", function () {
        const { collection } = createCollection({
          a: { user: { profile: { name: "Tom" } } },
          b: { user: { profile: { name: "Jack" } } },
        });

        expect(
          collection
            .where({
              user: {
                profile: {
                  name: "Tom",
                },
              },
            })
            .get(),
        ).to.deep.equal([{ _id: "a", user: { profile: { name: "Tom" } } }]);
      });

      it(`supports ${RegExp.name} conditions`, function () {
        const { collection } = createCollection({
          a: { name: "Tom" },
          b: { name: "Jack" },
          c: { name: "Tony" },
        });

        expect(
          collection
            .where({
              name: /^To/,
            })
            .get(),
        ).to.deep.equal([
          { _id: "a", name: "Tom" },
          { _id: "c", name: "Tony" },
        ]);
      });

      it(`supports ${MemongoQueryCommand.name} conditions`, function () {
        const adult = new MemongoQueryCommand(
          (val) => typeof val === "number" && val >= 18,
        );

        const { collection } = createCollection({
          a: { age: 20 },
          b: { age: 17 },
        });

        expect(
          collection
            .where({
              age: adult,
            })
            .get(),
        ).to.deep.equal([{ _id: "a", age: 20 }]);
      });

      it("supports array conditions", function () {
        const { collection } = createCollection({
          a: { tags: ["a", "b"] },
          b: { tags: ["b", "c"] },
        });

        expect(
          collection
            .where({
              tags: ["a", "b"],
            })
            .get(),
        ).to.deep.equal([{ _id: "a", tags: ["a", "b"] }]);
      });

      it("supports combining multiple or all different condition types", function () {
        const isAdult = new MemongoQueryCommand(
          (val) => typeof val === "number" && val >= 18,
        );

        const { collection } = createCollection({
          a: {
            name: "Tom",
            age: 20,
            tags: ["admin", "user"],
            profile: { city: "NYC", country: "UK" },
          },
          b: {
            name: "Jack",
            age: 17,
            tags: ["user"],
            profile: { city: "LA" },
          },
          c: {
            name: "Tony",
            age: 30,
            tags: ["admin", "user"],
            profile: { city: "NYC", country: "UK" },
          },
          d: {
            name: "James",
            age: 25,
            tags: ["user"],
            profile: { city: "NYC", country: "USA" },
          },
        });

        expect(
          collection
            .where({
              _id: /^c/,
              name: /^T/,
              age: isAdult,
              tags: ["admin", "user"],
              "profile.city": "NYC",
              profile: {
                country: "UK",
              },
            })
            .get(),
        ).to.deep.equal([
          {
            _id: "c",
            name: "Tony",
            age: 30,
            tags: ["admin", "user"],
            profile: { city: "NYC", country: "UK" },
          },
        ]);
      });
    });
  });

  describe(`${MemongoCollection.prototype.limit.name}`, function () {
    it(`returns a new collection with a limit query option applied which will  be applied when ${MemongoCollection.prototype.get.name} executes`, function () {
      const { collection } = createCollection({
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      });

      expect(collection.limit(2).get().length).to.deep.equal(2);
    });

    it("does not mutate the original collection query options", function () {
      const { collection } = createCollection(
        {
          a: { value: 1 },
          b: { value: 2 },
          c: { value: 3 },
        },
        {},
      );

      collection.limit(2);

      expect(collection.get().length).to.equal(3);
    });
  });

  describe(`${MemongoCollection.prototype.skip.name}`, function () {
    it(`returns a new collection with skip query option applied which will  be applied when ${MemongoCollection.prototype.get.name} executes`, function () {
      const { collection } = createCollection({
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      });

      expect(collection.skip(1).get().length).to.equal(2);
    });

    it("does not mutate the original collection query options", function () {
      const { collection } = createCollection({
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      });

      collection.skip(1);

      expect(collection.get().length).to.equal(3);
    });
  });

  describe(`${MemongoCollection.prototype.orderBy.name}`, function () {
    it(`returns a new collection with orderBy query option applied which will  be applied when ${MemongoCollection.prototype.get.name} executes`, function () {
      const { collection } = createCollection({
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      });

      expect(
        collection.orderBy("value", "desc").get(),
      ).to.deep.equal([
        { _id: "c", value: 3 },
        { _id: "b", value: 2 },
        { _id: "a", value: 1 },
      ]);
    });

    it("supports multiple orderBy calls", function () {
      const { collection } = createCollection({
        a: { value: 1, name: "Tom" },
        b: { value: 2, name: "Jack" },
        c: { value: 2, name: "Tom" },
      });
      expect(
        (collection
          .orderBy("value", "desc")
          .orderBy("name", "asc")).get(),
      ).to.deep.equal([
        { _id: "b", value: 2, name: "Jack" },
        { _id: "c", value: 2, name: "Tom" },
        { _id: "a", value: 1, name: "Tom" },
      ]);
    });

    it("does not mutate the original collection query options", function () {
      const { collection } = createCollection({
        a: { value: 1, name: "Tom" },
        b: { value: 2, name: "Jack" },
        c: { value: 3, name: "Tom" },
      });

      collection.orderBy("value", "desc");

      expect(
        (collection
          .orderBy("name", "asc")).get(),
      ).to.deep.equal([
        { _id: "b", value: 2, name: "Jack" },
        { _id: "a", value: 1, name: "Tom" },
        { _id: "c", value: 3, name: "Tom" },
      ]);
    });
  });

  describe(`${MemongoCollection.prototype.count.name}`, function () {
    it("returns the number of documents", function () {
      const { collection } = createCollection({
        a: { name: "Tom" },
        b: { name: "Jack" },
      });

      expect(collection.count()).to.equal(2);
    });
  });

  describe(`${MemongoCollection.prototype.get.name}`, function () {
    it("returns all cloned documents with _id added on each document", function () {
      const { collection } = createCollection({
        a: { profile: { name: "Tom" } },
        b: { profile: { name: "Jack" } },
      });

      const docs = collection.get();
      (docs[0]!.profile as { name: string }).name = "Changed";
      expect(collection.get()).to.deep.equal([
        { _id: "a", profile: { name: "Tom" } },
        { _id: "b", profile: { name: "Jack" } },
      ]);
    });

    it("applies skip, limit, and orderBy together", function () {
      const { collection } = createCollection(
        {
          a: { value: 1 },
          b: { value: 2 },
          c: { value: 3 },
          d: { value: 4 },
        },
        {
          skip: 1,
          limit: 2,
        },
      );

      expect(collection.orderBy("value", "desc").get()).to.deep.equal([
        { _id: "c", value: 3 },
        { _id: "b", value: 2 },
      ]);
    });

    it(`throws ${IncomparableValueError.name} if sorting encounters incomparable values`, function () {
      const { collection } = createCollection({
        a: { value: 1 },
        b: { value: "string" },
      });

      expect(() => collection.orderBy("value", "desc").get()).to.throw(
        IncomparableValueError,
      );
    });
  });

  describe(`${MemongoCollection.prototype.update.name}`, function () {
    it("updates all documents in the collection, and delegates writing to the root", async function () {
      const { collection, root } = createCollection({
        a: { name: "Tom", status: "active" },
        b: { name: "Jack", status: "active" },
      });

      await collection.update({
        status: "inactive",
      });

      expect(collection.get()).to.deep.equal([
        { _id: "a", name: "Tom", status: "inactive" },
        { _id: "b", name: "Jack", status: "inactive" },
      ]);
      expect(root.writeCalls).to.equal(1);
    });

    it("supports JSONUpdate", async function () {
      const { collection, root } = createCollection({
        a: {
          profile: { name: "Tom", age: 20, loveLetters: ["a", "b"] },
          toBeDeleted: "bye",
        },
        b: { profile: { name: "Jack", age: 18, loveLetters: ["c"] } },
      });

      await collection.update({
        "profile.name": "Updated",
        "profile.age": (oldAge: number) => oldAge + 1,
        "profile.loveLetters.0": "z",
        toBeDeleted: REMOVE,
      });

      expect(collection.get()).to.deep.equal([
        {
          _id: "a",
          profile: { name: "Updated", age: 21, loveLetters: ["z", "b"] },
        },
        {
          _id: "b",
          profile: { name: "Updated", age: 19, loveLetters: ["z"] },
        },
      ]);
      expect(root.writeCalls).to.equal(1);
    });

    describe("is transactional", async function () {
      it(`throws if it fails, nothing changes`, async function () {
        const { collection, root } = createCollection({
          a: { name: "Tom", age: 20 },
          b: { name: "Jack", age: 18 },
        });

        await expectRejects(() =>
          collection.update({
            name: "Updated",
            "age.year": 25,
          }),
        );

        expect(collection.get()).to.deep.equal([
          { _id: "a", name: "Tom", age: 20 },
          { _id: "b", name: "Jack", age: 18 },
        ]);
        expect(root.writeCalls).to.equal(0);
      });
    });
  });

  describe(`${MemongoCollection.prototype.remove.name}`, function () {
    it("removes all documents and delegates writing to the root", async function () {
      const { collection, root } = createCollection({
        a: { name: "Tom" },
        b: { name: "Jack" },
      });

      await collection.remove();

      expect(collection.count()).to.equal(0);
      expect(collection.get()).to.deep.equal([]);
      expect(root.writeCalls).to.equal(1);
    });
  });

  describe(`${MemongoCollection.prototype.removeById.name}`, function () {
    it("removes the specified document and delegates writing to the root", async function () {
      const { collection, root } = createCollection({
        a: { name: "Tom" },
        b: { name: "Jack" },
      });

      await collection.removeById("a");

      expect(collection.get()).to.deep.equal([{ _id: "b", name: "Jack" }]);
      expect(root.writeCalls).to.equal(1);
    });

    it(`throws ${DocumentNotExistsError.name} if the document does not exist, and nothing changes`, async function () {
      const { collection, root } = createCollection();

      await expectRejects(
        () => collection.removeById("missing"),
        DocumentNotExistsError,
      );

      expect(collection.get()).to.deep.equal([]);
      expect(root.writeCalls).to.equal(0);
    });
  });

  describe(`${MemongoCollection.prototype.write.name}`, function () {
    it("delegates to root.write", async function () {
      const { collection, root } = createCollection();

      await collection.write();

      expect(root.writeCalls).to.equal(1);
    });
  });
});
