import { expect } from "chai";
import { query } from "../../../src/operators/query.js";

describe("query operators", () => {
  it("eq/neq: matches equal values", () => {
    expect(query.eq(5).exec(5)).to.be.true;
    expect(query.eq(5).exec(10)).to.be.false;
    expect(query.neq(5).exec(10)).to.be.true;
    expect(query.neq(5).exec(5)).to.be.false;
  });

  it("lt/lte: compare less than", () => {
    expect(query.lt(10).exec(5)).to.be.true;
    expect(query.lt(10).exec(10)).to.be.false;
    expect(query.lte(10).exec(10)).to.be.true;
  });

  it("gt/gte: compare greater than", () => {
    expect(query.gt(10).exec(15)).to.be.true;
    expect(query.gt(10).exec(10)).to.be.false;
    expect(query.gte(10).exec(10)).to.be.true;
  });

  it("in/nin: array membership", () => {
    expect(query.in([1, 2, 3]).exec(2)).to.be.true;
    expect(query.in([1, 2, 3]).exec(5)).to.be.false;
    expect(query.nin([1, 2, 3]).exec(5)).to.be.true;
    expect(query.nin<number>([]).exec(1)).to.be.true;
  });

  it("exists/nexists: checks for undefined", () => {
    expect(query.exists().exec(5)).to.be.true;
    expect(query.exists().exec(undefined)).to.be.false;
    expect(query.nexists().exec(undefined)).to.be.true;
    expect(query.nexists().exec(5)).to.be.false;
  });

  it("and: all conditions must match", () => {
    const cmd = query.and(query.gte(10), query.lte(20));
    expect(cmd.exec(15)).to.be.true;
    expect(cmd.exec(5)).to.be.false;
    expect(query.and().exec(100)).to.be.true;
  });

  it("or: any condition matches", () => {
    const cmd = query.or(query.lt(5), query.gt(20));
    expect(cmd.exec(3)).to.be.true;
    expect(cmd.exec(10)).to.be.false;
    expect(query.or().exec(100)).to.be.false;
  });

  it("not: negates condition", () => {
    const ngte10 = query.not(query.gte(10));
    expect(ngte10.exec(5)).to.be.true;
    expect(ngte10.exec(10)).to.be.false;
  });

  it("combines operators", () => {
    const cmd = query.or(
      query.and(query.gte(10), query.lte(20)),
      query.and(query.gte(30), query.lte(40)),
    );
    expect(cmd.exec(15)).to.be.true;
    expect(cmd.exec(35)).to.be.true;
    expect(cmd.exec(25)).to.be.false;
  });
});
