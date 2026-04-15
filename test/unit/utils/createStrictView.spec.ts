import { expect } from "chai";
import { createStrictView } from "../../../src/utils/createStrictView.js";

describe("createStrictView", function () {
  let source: any, view: any;

  beforeEach(function () {
    source = {
      name: "Alice",
      age: 30,
      email: "alice@example.com",
      [Symbol("id")]: 12345,
    };
    view = createStrictView(source, ["name", "age"]);
  });

  describe("property access (get)", function () {
    it("should return the value of allowed properties", function () {
      expect(view.name).to.equal("Alice");
      expect(view.age).to.equal(30);
    });

    it("should return `undefined` for non-allowed properties", function () {
      expect(view.email).to.be.undefined;
      expect(view.whatever).to.be.undefined;
    });
  });

  describe("property assignment (set)", function () {
    it("should update the original object for allowed properties", function () {
      view.name = "Bob";
      view.age = 35;

      expect(source.name).to.equal("Bob");
      expect(source.age).to.equal(35);
    });

    it("should throw when setting a non-allowed property", function () {
      expect(() => {
        view.email = "new@example.com";
      }).to.throw(TypeError);
    });

    it("should not modify the original object for non-allowed properties", function () {
      expect(() => {
        view.email = "new@example.com";
      }).to.throw(TypeError);
      expect(source.email).to.equal("alice@example.com");
    });
  });

  describe("property deletion (deleteProperty)", function () {
    it("should delete allowed properties from the original object", function () {
      delete view.age;
      expect(source).to.not.have.property("age");
      expect(view).to.not.have.property("age");
    });

    it("should throw when attempting to delete a non-allowed property", function () {
      expect(() => {
        delete view.email;
      }).to.throw(TypeError);
      expect(source.email).to.equal("alice@example.com");
    });
  });

  describe("property existence (has)", function () {
    it("should return `true` for allowed properties that exist", function () {
      expect("name" in view).to.be.true;
      expect("age" in view).to.be.true;
    });

    it("should return `false` for allowed properties that do not exist", function () {
      delete view.age;
      expect("age" in view).to.be.false;
    });

    it("should return `false` for non-allowed properties even if they exist on source", function () {
      expect("email" in source).to.be.true;
      expect("email" in view).to.be.false;
    });
  });

  describe("enumeration (ownKeys)", function () {
    it("should list only allowed properties that actually exist on the source", function () {
      expect(Object.keys(view)).to.have.members(["name", "age"]);

      delete view.age;
      expect(Object.keys(view)).to.have.members(["name"]);
    });

    it("should not include non-allowed properties", function () {
      const keys = Object.keys(view);
      expect(keys).to.not.include("email");
    });

    it("should reflect dynamic deletion of allowed properties", function () {
      expect(Reflect.ownKeys(view)).to.include.members(["name", "age"]);
      delete view.name;
      expect(Reflect.ownKeys(view)).to.have.members(["age"]);
    });
  });

  describe("property descriptor retrieval (getOwnPropertyDescriptor)", function () {
    it("should return a descriptor for allowed properties that exist", function () {
      const desc: any = Object.getOwnPropertyDescriptor(view, "name");
      expect(desc).to.exist;
      expect(desc.value).to.equal("Alice");
      expect(desc.enumerable).to.be.true;
      expect(desc.configurable).to.be.true;
      expect(desc.writable).to.be.true;
    });

    it("should return `undefined` for non-allowed properties", function () {
      expect(Object.getOwnPropertyDescriptor(view, "email")).to.be.undefined;
    });

    it("should return `undefined` for allowed properties that have been deleted", function () {
      delete view.age;
      expect(Object.getOwnPropertyDescriptor(view, "age")).to.be.undefined;
    });
  });

  describe("property definition (defineProperty)", function () {
    it("should reject definition of non-allowed properties", function () {
      expect(function () {
        Object.defineProperty(view, "newProp", { value: 42 });
      }).to.throw(TypeError);
      expect(source).to.not.have.property("newProp");
    });
  });

  describe("prototype chain", function () {
    it("should return `null` for getPrototypeOf", function () {
      expect(Object.getPrototypeOf(view)).to.be.null;
    });

    it("should not expose prototype properties", function () {
      expect(view.toString).to.be.undefined;
      expect(view.hasOwnProperty).to.be.undefined;
    });
  });

  describe("Symbol properties", function () {
    it("should work with symbol keys when included in allowedKeys", function () {
      const sym = Symbol("test");
      const obj = { [sym]: "secret" };
      const v: any = createStrictView(obj, [sym]);

      expect(v[sym]).to.equal("secret");
      expect(Object.getOwnPropertySymbols(v)).to.include(sym);
      expect(sym in v).to.be.true;

      v[sym] = "new secret";
      expect(obj[sym]).to.equal("new secret");

      delete v[sym];
      expect(obj).to.not.have.property(sym);
    });
  });

  describe("edge cases", function () {
    it("should handle an empty allowedKeys array", function () {
      const v: any = createStrictView(source, []);
      expect(Object.keys(v)).to.be.empty;
      expect(v.name).to.be.undefined;
      expect(function () {
        v.name = "test";
      }).to.throw(TypeError);
    });

    it("should handle non-existent allowed keys gracefully", function () {
      const v: any = createStrictView(source, ["name", "ghost"]);
      expect(Object.keys(v)).to.have.members(["name"]);
      expect(v.ghost).to.be.undefined;
      expect("ghost" in v).to.be.false;
    });

    it("should preserve accessor properties from the source", function () {
      const obj = {
        _x: 1,
        get x() {
          return obj._x;
        },
        set x(val) {
          obj._x = val;
        },
      };
      const v: any = createStrictView(obj, ["x"]);

      expect(v.x).to.equal(1);
      v.x = 10;
      expect(obj._x).to.equal(10);
      expect(v.x).to.equal(10);
    });
  });
});
