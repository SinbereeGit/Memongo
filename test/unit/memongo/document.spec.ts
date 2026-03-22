import type {
  DocumentContent,
  DocumentRoot,
} from "../../../src/types/document.js";

import { expect } from "chai";
import { MemongoDocument } from "../../../src/core/memongo/document.js";
import { expectRejects } from "../../utils/expect-rejects.js";
import { REMOVE } from "../../../src/core/json/json-object-ops.js";

describe(`${MemongoDocument.name}`, function () {
  function createFakeRoot() {
    return {
      writeCalls: 0,
      removeByIdCalls: new Array<string>(),

      write() {
        this.writeCalls++;
      },

      removeById(id: string) {
        this.removeByIdCalls.push(id);
      },
    };
  }

  describe(`static ${MemongoDocument.getDocWithId.name}`, function () {
    it("returns cloned document with _id added", function () {
      const doc: DocumentContent = {
        name: "Tom",
        profile: {
          age: 12,
        },
      };

      const result = MemongoDocument.getDocWithId(doc, "doc1");

      doc.name = "Jack";
      expect(result).to.deep.equal({
        name: "Tom",
        profile: {
          age: 12,
        },
        _id: "doc1",
      });
    });
  });

  describe(`${MemongoDocument.prototype.get.name}`, function () {
    it("returns cloned document data with _id", function () {
      const root = createFakeRoot() satisfies DocumentRoot;
      const content: DocumentContent = {
        title: "Hello",
        nested: {
          count: 1,
        },
      };

      const document = new MemongoDocument(root, "abc123", content);
      const result = document.get();

      expect(result).to.not.equal(content);
      expect(result).to.deep.equal({
        title: "Hello",
        nested: {
          count: 1,
        },
        _id: "abc123",
      });
    });
  });

  describe(`${MemongoDocument.prototype.update.name}`, function () {
    it("updates the content and asks root to write", async function () {
      const root = createFakeRoot() satisfies DocumentRoot;
      const content: DocumentContent = {
        title: "Old",
        profile: {
          age: 12,
        },
      };

      const document = new MemongoDocument(root, "doc1", content);

      document.update({
        title: "New",
        "profile.age": 13,
      });

      expect(content).to.deep.equal({
        title: "New",
        profile: {
          age: 13,
        },
      });

      expect(root.writeCalls).to.equal(1);
    });

    it(`supports JSONUpdate`, async function () {
      const root = createFakeRoot() satisfies DocumentRoot;
      const content: DocumentContent = {
        title: "Test",
        profile: {
          name: "Jack",
          age: 18,
          loveLetters: ["a", "b"],
        },
        toBeDeleted: "bye",
      };

      const document = new MemongoDocument(root, "doc1", content);

      document.update({
        title: undefined,
        "profile.name": "Jack Chen",
        "profile.age": (oldAge: number) => oldAge + 1,
        "profile.loveLetters.0": "z",
        toBeDeleted: REMOVE,
      });

      expect(content).to.deep.equal({
        title: "Test",
        profile: {
          name: "Jack Chen",
          age: 19,
          loveLetters: ["z", "b"],
        },
      });

      expect(root.writeCalls).to.equal(1);
    });

    describe("is transactional", async function () {
      it("throws if it fails, nothing changes", async function () {
        const root = createFakeRoot() satisfies DocumentRoot;
        const content: DocumentContent = {
          title: "Test",
          profile: {
            name: "Jack",
            age: 18,
            loveLetters: ["a", "b"],
          },
        };

        const document = new MemongoDocument(root, "doc1", content);

        await expectRejects(() =>
          document.update({
            title: undefined,
            "profile.name": "Jack Chen",
            "profile.age": (oldAge: number) => oldAge + 1,
            "profile.loveLetters.o": "z",
          }),
        );

        expect(content).to.deep.equal({
          title: "Test",
          profile: {
            name: "Jack",
            age: 18,
            loveLetters: ["a", "b"],
          },
        });

        expect(root.writeCalls).to.equal(0);
      });
    });
  });

  describe(`${MemongoDocument.prototype.remove.name}`, function () {
    it("delegates removal to root with the document id", async function () {
      const root = createFakeRoot() satisfies DocumentRoot;
      const content: DocumentContent = {
        title: "Hello",
      };

      const document = new MemongoDocument(root, "doc9", content);

      document.remove();

      expect(root.removeByIdCalls).to.deep.equal(["doc9"]);
    });
  });
});
