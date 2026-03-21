import { expect } from "chai";

/**
 * @warning Call it with `await`!
 */
export async function expectRejects(
  fn: () => Promise<unknown>,
  errorClass?: new (...args: any[]) => Error,
): Promise<unknown> {
  try {
    await fn();
    expect.fail("Expected promise to reject");
  } catch (error) {
    if (errorClass) {
      expect(error).to.be.instanceOf(errorClass);
    }
    return error;
  }
}