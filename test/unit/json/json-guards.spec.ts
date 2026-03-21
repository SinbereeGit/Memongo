import { expect } from "chai";
import {
  isJSONContainer,
  isJSONArray,
  isJSONObject,
} from "../../../src/core/json/json-guards.js";

describe("JSON Guards", function () {
  describe(`${isJSONContainer.name}`, function () {
    it("returns true for JSONObject", function () {
      expect(isJSONContainer({})).to.be.true;
      expect(isJSONContainer({ a: 1 })).to.be.true;
      expect(isJSONContainer({ a: { b: 2 } })).to.be.true;
    });

    it("returns true for JSONArray", function () {
      expect(isJSONContainer([])).to.be.true;
      expect(isJSONContainer([1, 2, 3])).to.be.true;
      expect(isJSONContainer([{ a: 1 }])).to.be.true;
    });

    it("returns false for undefined", function () {
      expect(isJSONContainer(undefined)).to.be.false;
    });

    describe("for JSONPrimitive", function () {
      it("returns false for null", function () {
        expect(isJSONContainer(null)).to.be.false;
      });
      it("returns false for primitives", function () {
        expect(isJSONContainer("string")).to.be.false;
        expect(isJSONContainer(123)).to.be.false;
        expect(isJSONContainer(true)).to.be.false;
        expect(isJSONContainer(false)).to.be.false;
      });
    });
  });

  describe(`${isJSONArray.name}`, function () {
    it("returns true for JSONArray", function () {
      expect(isJSONArray([])).to.be.true;
      expect(isJSONArray([1, 2, 3])).to.be.true;
      expect(isJSONArray([{ a: 1 }])).to.be.true;
      expect(isJSONArray(["string", true, null])).to.be.true;
    });

    it("returns false for JSONObject", function () {
      expect(isJSONArray({})).to.be.false;
      expect(isJSONArray({ a: 1 })).to.be.false;
      expect(isJSONArray({ 0: "zero" })).to.be.false;
    });

    it("returns false for undefined", function () {
      expect(isJSONArray(undefined)).to.be.false;
    });

    describe("for JSONPrimitive", function () {
      it("returns false for null", function () {
        expect(isJSONArray(null)).to.be.false;
      });

      it("returns false for primitives", function () {
        expect(isJSONArray("string")).to.be.false;
        expect(isJSONArray(123)).to.be.false;
        expect(isJSONArray(true)).to.be.false;
        expect(isJSONArray(false)).to.be.false;
      });
    });
  });

  describe(`${isJSONObject.name}`, function () {
    it("returns true for JSONObject", function () {
      expect(isJSONObject({})).to.be.true;
      expect(isJSONObject({ a: 1 })).to.be.true;
      expect(isJSONObject({ a: { b: 2 } })).to.be.true;
      expect(isJSONObject({ "0": "zero" })).to.be.true;
    });

    it("returns false for JSONArray", function () {
      expect(isJSONObject([])).to.be.false;
      expect(isJSONObject([1, 2, 3])).to.be.false;
      expect(isJSONObject([{ a: 1 }])).to.be.false;
    });

    it("returns false for undefined", function () {
      expect(isJSONObject(undefined)).to.be.false;
    });

    describe("for JSONPrimitive", function () {
      it("returns false for null", function () {
        expect(isJSONObject(null)).to.be.false;
      });
      it("returns false for primitives", function () {
        expect(isJSONObject("string")).to.be.false;
        expect(isJSONObject(123)).to.be.false;
        expect(isJSONObject(true)).to.be.false;
        expect(isJSONObject(false)).to.be.false;
      });
    });
  });
});
