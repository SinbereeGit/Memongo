import { expect } from "chai";
import { MemongoQueryCommand } from "../../../src/core/memongo/query-command.js";

describe(`${MemongoQueryCommand.name}`, function () {
  it("can execute the given query function", function () {
    const gt1 = new MemongoQueryCommand((val: number) => val > 1);

    expect(gt1.exec(2)).to.equal(true);
    expect(gt1.exec(1)).to.equal(false);
  });

  describe(`${MemongoQueryCommand.prototype.and.name}`, function () {
    it("combines two commands with logic and", function () {
      const gt1 = new MemongoQueryCommand((val: number) => val > 1);
      const lt5 = new MemongoQueryCommand((val: number) => val < 5);

      const gt1Andlt5 = gt1.and(lt5);

      expect(gt1Andlt5.exec(3)).to.equal(true);
      expect(gt1Andlt5.exec(1)).to.equal(false);
      expect(gt1Andlt5.exec(5)).to.equal(false);
    });
  });

  describe(`${MemongoQueryCommand.prototype.or.name}`, function () {
    it("combines two commands with logic or", function () {
      const lt0 = new MemongoQueryCommand((val: number) => val < 0);
      const gt10 = new MemongoQueryCommand((val: number) => val > 10);

      const lt0Orgt10 = lt0.or(gt10);

      expect(lt0Orgt10.exec(-1)).to.equal(true);
      expect(lt0Orgt10.exec(11)).to.equal(true);
      expect(lt0Orgt10.exec(5)).to.equal(false);
    });
  });

  describe(`${MemongoQueryCommand.prototype.not.name}`, function () {
    it("negates the command", function () {
      const gt1 = new MemongoQueryCommand((val: number) => val > 1);
      const ngt1 = gt1.not();

      expect(ngt1.exec(2)).to.equal(false);
      expect(ngt1.exec(1)).to.equal(true);
    });
  });
});
