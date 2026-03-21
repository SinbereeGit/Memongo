import { REMOVE } from "../../../src/core/json/json-object-ops.js";
import { expect } from "chai";
import { update } from "../../../src/operators/update.js";

describe("update operators", () => {
  it("set: replaces value", () => {
    expect(update.set(10)).to.equal(10);
    expect(update.set("hello")).to.equal("hello");
    const obj = { a: 1 };
    const result = update.set(obj);
    expect(result).to.not.equal(obj);
    expect(result).to.deep.equal(obj);
  });

  it(`remove: represents ${REMOVE.toString()}`, () => {
    expect(update.remove()).to.equal(REMOVE);
  });

  it("inc: increments number", () => {
    const inc5 = update.inc(5);
    expect(inc5(10)).to.equal(15);
    expect(inc5(0)).to.equal(5);
    expect(inc5(-10)).to.equal(-5);
  });

  it("mul: multiplies number", () => {
    const mul2 = update.mul(2);
    expect(mul2(5)).to.equal(10);
    expect(mul2(0)).to.equal(0);
    expect(mul2(-3)).to.equal(-6);
  });

  it("push: adds element to array", () => {
    const push1 = update.push(1);
    const arr = [1, 2, 3];
    const result = push1(arr);
    expect(result).to.deep.equal([1, 2, 3, 1]);
    expect(result).to.equal(arr);

    const obj = { x: 1 };
    const pushObj = update.push(obj);
    const arr2 = [{ x: 0 }];
    const result2 = pushObj(arr2);
    expect(result2).to.deep.equal([{ x: 0 }, { x: 1 }]);
    expect(result2).to.equal(arr2);
    expect(result2[1]).to.deep.equal(obj);
    expect(result2[1]).to.not.equal(obj);
  });

  it("pop: removes last element", () => {
    const pop = update.pop();
    const arr = [1, 2, 3];
    const result = pop(arr);
    expect(result).to.deep.equal([1, 2]);
    expect(result).to.equal(arr);
  });

  it("shift: removes first element", () => {
    const shift = update.shift();
    const arr = [1, 2, 3];
    const result = shift(arr);
    expect(result).to.deep.equal([2, 3]);
    expect(result).to.equal(arr);
  });

  it("unshift: adds element to array start", () => {
    const unshift0 = update.unshift(0);
    const arr = [1, 2, 3];
    const result = unshift0(arr);
    expect(result).to.deep.equal([0, 1, 2, 3]);
    expect(result).to.equal(arr);

    const obj = { x: 1 };
    const unshiftObj = update.unshift(obj);
    const arr2 = [{ x: 0 }];
    const result2 = unshiftObj(arr2);
    expect(result2).to.deep.equal([{ x: 1 }, { x: 0 }]);
    expect(result2).to.equal(arr2);
    expect(result2[0]).to.deep.equal(obj);
    expect(result2[0]).to.not.equal(obj);
  });
});
