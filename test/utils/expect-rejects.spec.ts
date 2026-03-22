import { expect } from "chai";
import { expectRejects } from "./expect-rejects.js";

describe(`${expectRejects.name}`, function () {
  class CustomError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "CustomError";
    }
  }

  it("passes when promise rejects", async function () {
    await expectRejects(() => Promise.reject(new Error("Test error")));
  });

  it("returns the thrown error when promise rejects", async function () {
    const error = await expectRejects(async () => {
      throw new Error("boom");
    });

    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.equal("boom");
  });

  it("fails when promise resolves", async function () {
    let hasFailed = false;

    try {
      await expectRejects(() => Promise.resolve(void 0));
    } catch {
      hasFailed = true;
    }

    if (!hasFailed) expect.fail("Should fail when promise resolves");
  });

  it("verifies error class when specified", async function () {
    await expectRejects(() => Promise.reject(new CustomError()), CustomError);
  });

  it("fails when error class does not match", async function () {
    let hasFailed = false;
    try {
      await expectRejects(() => Promise.reject(new Error()), CustomError);
    } catch {
      hasFailed = true;
    }
    if (!hasFailed) expect.fail("Should fail when error class does not match");
  });

  it("fails when synchronous function does not throw", async function () {
    let failCount = 0;
    try {
      await expectRejects(() => {});
    } catch {
      failCount += 1;
    }

    try {
      await expectRejects(() => 1);
    } catch {
      failCount += 1;
    }

    if (failCount !== 2)
      expect.fail("Should fail when synchronous function does not throw");
  });

  it("handles synchronous errors thrown by function", async function () {
    await expectRejects(() => {
      throw new Error();
    });
  });

  it("supports synchronous function that throws specified error class", async function () {
    await expectRejects(() => {
      throw new CustomError();
    }, CustomError);

    let hasFailed = false;
    try {
      await expectRejects(() => {
        throw new Error();
      }, CustomError);
    } catch {
      hasFailed = true;
    }
    if (!hasFailed)
      expect.fail("Should fail when synchronous function throws error of wrong class");
  });
});
