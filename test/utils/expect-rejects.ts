import { expect } from "chai";

/**
 * @remarks
 * **This function must be called with `await`.**
 * 
 * Primarily designed for async functions (returning a Promise),
 * but also works with synchronous functions which are expected to throw errors.
 */
export async function expectRejects(
  fn: () => Promise<unknown> | unknown,
  errorClass?: new (...args: any[]) => Error,
): Promise<unknown> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
  } catch (error) {
    if (errorClass) {
      expect(error).to.be.instanceOf(errorClass);
    }
    return error;
  }

  expect.fail("Expects promise to reject (or sync function to throw)");
}
