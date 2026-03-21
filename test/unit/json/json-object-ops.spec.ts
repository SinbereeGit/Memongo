import { expect } from "chai";
import { JSONObjectOps } from "../../../src/core/json/json-object-ops.js";
import { PathConflictError } from "../../../src/errors.js";
import { REMOVE } from "../../../src/core/json/json-object-ops.js";

describe(`JSONObjectOps`, function () {
  describe(`${JSONObjectOps.getByPath.name}`, function () {
    const sampleJSONObj = {
      a: {
        b: {
          c: 123,
        },
        d: [{ c: 1 }, { c: 2 }],
      },
    };

    it("supports dot notation paths with optional array indices", function () {
      expect(JSONObjectOps.getByPath(sampleJSONObj, "a.b.c")).to.equal(123);
      expect(JSONObjectOps.getByPath(sampleJSONObj, "a.d.1.c")).to.equal(2);
    });

    it("returns undefined if a property does not exist", function () {
      expect(JSONObjectOps.getByPath(sampleJSONObj, "a.b.d")).to.equal(
        undefined,
      );
      expect(JSONObjectOps.getByPath(sampleJSONObj, "a..b")).to.equal(
        undefined,
      );
    });
  });

  describe(`${JSONObjectOps.setByPath.name}`, function () {
    it("supports dot notation paths with optional array indices", function () {
      const obj = {
        a: {
          b: {
            c: 1,
          },
          d: [{ c: 1 }, { c: 2 }],
        },
      };

      JSONObjectOps.setByPath(obj, "a.b.c", 123);
      JSONObjectOps.setByPath(obj, "a.d.1.c", 999);

      expect(obj.a.b.c).to.equal(123);
      expect(obj.a.d[1]!.c).to.equal(999);
    });

    it("creates missing object or array containers automatically", function () {
      const obj1 = {};

      JSONObjectOps.setByPath(obj1, "a.b.c", 123);

      expect(obj1).to.deep.equal({
        a: {
          b: {
            c: 123,
          },
        },
      });

      const obj2 = {};

      JSONObjectOps.setByPath(obj2, "a.0.b", 123);

      expect(obj2).to.deep.equal({
        a: [{ b: 123 }],
      });
    });

    describe("is transactional", function () {
      it(`throws ${PathConflictError.name} if a path segment conflicts with a non-container value, and the object is left unchanged`, function () {
        const obj = {
          a: 1,
        };

        expect(() => JSONObjectOps.setByPath(obj, "a.b", 123)).to.throw(
          PathConflictError,
        );
        expect(obj).to.deep.equal({
          a: 1,
        });
      });

      it(`throws ${PathConflictError.name} if a path segment used to access an array is not a valid array index, and the object is left unchanged`, function () {
        const obj = {
          a: [],
        };

        expect(() => JSONObjectOps.setByPath(obj, "a.x", 123)).to.throw(
          PathConflictError,
        );
        expect(obj).to.deep.equal({
          a: [],
        });
      });
    });
  });

  describe(`${JSONObjectOps.clone.name}`, function () {
    it("returns a deep copy of a JSON object", function () {
      const obj = {
        a: {
          b: [1, 2, { c: 3 }],
        },
      };

      const copied = JSONObjectOps.clone(obj);

      expect(copied).to.deep.equal(obj);
      expect(copied).to.not.equal(obj);
      expect(copied.a).to.not.equal(obj.a);
      expect(copied.a.b).to.not.equal(obj.a.b);
    });
  });

  describe(`${JSONObjectOps.update.name}`, function () {
    describe("supports JSONUpdate", function () {
      it("supports dot notation paths with optional array indices", function () {
        const obj = {
          a: {
            b: 1,
            d: [{ c: 1 }, { c: 2 }],
          },
        };

        JSONObjectOps.update(obj, {
          "a.b": 2,
          "a.d.1.c": 999,
        });

        expect(obj.a.b).to.equal(2);
        expect(obj.a.d[1]!.c).to.equal(999);
      });

      it("supports direct value patches", function () {
        const obj = {
          a: {
            b: 1,
          },
        };

        JSONObjectOps.update(obj, {
          "a.b": 123,
        });

        expect(obj.a.b).to.equal(123);
      });

      it("supports function patches", function () {
        const obj = {
          a: {
            b: 1,
          },
        };

        JSONObjectOps.update(obj, {
          "a.b": (value: number) => value + 1,
        });

        expect(obj.a.b).to.equal(2);
      });

      it("ignores undefined patches", function () {
        const obj = {
          a: {
            b: 1,
          },
        };

        JSONObjectOps.update(obj, {
          "a.b": undefined,
        });

        expect(obj.a.b).to.equal(1);
      });

      it(`supports ${REMOVE.toString()} patches`, function () {
        const obj = {
          a: {
            b: 1,
            c: 2,
          },
        };
        JSONObjectOps.update(obj, {
          "a.b": REMOVE,
        });
        expect(obj.a.b).to.be.undefined;
        expect(obj.a.c).to.equal(2);
      });
    });

    describe("is non-transactional", () => {
      it("throws if it fails, earlier changes remain", function () {
        const obj = { a: {}, b: 1 };

        expect(() =>
          JSONObjectOps.update(obj, {
            "a.x": 1,
            "b.c": 2,
          }),
        ).to.throw();

        expect(obj).to.deep.equal({
          a: { x: 1 },
          b: 1,
        });
      });
    });
  });
});
