import type { DatabaseContent } from "../../../src/types/database.js";

import { expect } from "chai";
import { MemongoDatabase } from "../../../src/core/memongo/database.js";
import {
  DatabaseNotInitializedError,
  CollectionAlreadyExistsError,
  CollectionNotExistsError,
} from "../../../src/errors.js";
import { expectRejects } from "../../utils/expect-rejects.js";
import { JSONObjectOps } from "../../../src/core/json/json-object-ops.js";

describe(`${MemongoDatabase.name}`, function () {
  it("supports pure-memory mode when no persistence is provided", async function () {
    const db = new MemongoDatabase();
    await db.init();
    expect(db.createCollection("users")).to.exist;
    db.removeCollection("users");
    expect(db.collection("users")).to.not.exist;
  });

  function createFakePersistence() {
    let storedData: DatabaseContent = {};
    return {
      _emitWriteError: false,
      writeCount: 0,
      enableEmitWriteError() {
        this._emitWriteError = true;
      },
      disableEmitWriteError() {
        this._emitWriteError = false;
      },

      async read(): Promise<DatabaseContent> {
        return JSONObjectOps.clone(storedData);
      },
      async write(
        dataContent: DatabaseContent,
        resolve: () => void,
        reject: (error: Error) => void,
      ): Promise<void> {
        if (this._emitWriteError) {
          reject(new Error("Failed to write to persistence"));
        } else {
          storedData = JSONObjectOps.clone(dataContent);
          this.writeCount++;
          resolve();
        }
      },
    };
  }

  function createDatabase(persistence = createFakePersistence()) {
    const db = new MemongoDatabase(
      {
        readDatabaseContentFunc: () => persistence.read(),
        writeDatabaseContentFunc: (dataContent, resolve, reject) =>
          persistence.write(dataContent, resolve, reject),
      },
      1, // for testing purposes, set write debounce default to 1ms to speed up tests that involve multiple writes
    );
    return { db, persistence };
  }

  describe(`${MemongoDatabase.prototype.init.name}`, function () {
    it("initializes the database and allows operations afterwards", async function () {
      const { db } = createDatabase();

      await db.init();

      expect(db.createCollection("users")).to.exist;
    });

    it("loads data from persistence into memory during init", async function () {
      const persistence = createFakePersistence();
      await persistence.write(
        { users: {} },
        () => {},
        () => {},
      );

      const { db } = createDatabase(persistence);

      await db.init();

      expect(db.collection("users")).to.exist;
    });

    it("can be called idempotently without causing issues", async function () {
      const { db } = createDatabase();

      await db.init();
      await db.init();

      expect(db.createCollection("users")).to.exist;
    });
  });

  describe(`${MemongoDatabase.prototype.createCollection.name}`, function () {
    it("creates a new collection that can be retrieved", async function () {
      const { db } = createDatabase();

      await db.init();

      expect(db.createCollection("users")).to.exist;
      expect(db.collection("users")).to.exist;
    });

    it("writes the new collection to persistence asynchronously", async function () {
      const persistence = createFakePersistence();
      const { db } = createDatabase(persistence);
      await db.init();
      db.createCollection("users");
      await db.flush();
      const persistedData = await persistence.read();
      expect(persistedData.users).to.exist;
    });

    describe("is transactional", function () {
      it(`throws ${DatabaseNotInitializedError.name} if database is not initialized, and persistence is unchanged`, async function () {
        const { db, persistence } = createDatabase();

        const persistedBefore = await persistence.read();

        await expectRejects(
          () => db.createCollection("users"),
          DatabaseNotInitializedError,
        );

        await db.flush();
        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
      });

      it(`throws ${CollectionAlreadyExistsError.name} if collection already exists, and persistence is unchanged`, async function () {
        const { db, persistence } = createDatabase();

        await db.init();
        db.createCollection("users");

        await db.flush();
        const persistedBefore = await persistence.read();

        await expectRejects(
          () => db.createCollection("users"),
          CollectionAlreadyExistsError,
        );

        await db.flush();
        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
        db.createCollection("items");
      });
    });
  });

  describe(`${MemongoDatabase.prototype.removeCollection.name}`, function () {
    it("removes a collection so it can no longer be retrieved", async function () {
      const { db } = createDatabase();

      await db.init();
      db.createCollection("users");

      expect(db.collection("users")).to.exist;

      db.removeCollection("users");

      expect(db.collection("users")).to.be.null;
    });

    it("writes the removal to persistence asynchronously", async function () {
      const { db, persistence } = createDatabase();

      await db.init();
      db.createCollection("users");
      await db.flush();
      expect(await persistence.read()).to.deep.equal({ users: {} });

      db.removeCollection("users");
      await db.flush();
      expect((await persistence.read()).users).to.be.undefined;
    });

    describe("is transactional", function () {
      it(`throws ${DatabaseNotInitializedError.name} if database is not initialized, and persistence is unchanged`, async function () {
        const { db, persistence } = createDatabase();

        const persistedBefore = await persistence.read();

        await expectRejects(
          () => db.removeCollection("users"),
          DatabaseNotInitializedError,
        );

        await db.flush();
        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
      });

      it(`throws ${CollectionNotExistsError.name} if collection does not exist, and persistence is unchanged`, async function () {
        const { db, persistence } = createDatabase();

        await db.init();

        const persistedBefore = await persistence.read();

        await expectRejects(
          () => db.removeCollection("missing"),
          CollectionNotExistsError,
        );

        await db.flush();
        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
      });
    });
  });

  describe(`${MemongoDatabase.prototype.collection.name}`, function () {
    it("returns a collection object for an existing collection", async function () {
      const { db } = createDatabase();

      await db.init();
      db.createCollection("users");

      const collection = db.collection("users");

      expect(collection).to.exist;
    });

    it("returns null if collection does not exist", async function () {
      const { db } = createDatabase();

      await db.init();

      const collection = db.collection("missing");

      expect(collection).to.be.null;
    });

    it(`throws ${DatabaseNotInitializedError.name} if database is not initialized`, async function () {
      const { db } = createDatabase();

      expect(() => db.collection("users")).to.throw(
        DatabaseNotInitializedError,
      );
    });
  });

  describe(`${MemongoDatabase.prototype.write.name}`, function () {
    it("writes the in-memory database to persistence asynchronously", async function () {
      const { db, persistence } = createDatabase();

      await db.init();
      db.createCollection("users");
      await db.flush();
      const persistedData = await persistence.read();
      expect(persistedData.users).to.exist;
    });

    it("debounces writes when multiple operations are performed in a short period of time", async function () {
      const { db, persistence } = createDatabase();

      await db.init();
      db.createCollection("users");
      db.createCollection("items");
      db.createCollection("orders");

      await db.flush();
      expect(persistence.writeCount).to.equal(1);
      expect(await persistence.read()).to.deep.equal({
        users: {},
        items: {},
        orders: {},
      });
    });

    it("records persistence errors instead of throwing", async function () {
      const { db, persistence } = createDatabase();

      await db.init();
      persistence.enableEmitWriteError();

      db.createCollection("users");

      await expectRejects(() => db.flush());
    });
  });

  describe(`${MemongoDatabase.prototype.flush.name}`, function () {
    it("waits for writes to finish", async function () {
      const { db, persistence } = createDatabase();

      await db.init();

      db.createCollection("users");

      await db.flush();
      expect(persistence.writeCount).to.equal(1);
      expect(await persistence.read()).to.deep.equal({ users: {} });
    });

    it("throws an AggregateError if there were errors during writes, and resets the database initialization state so it must be initialized again", async function () {
      const { db, persistence } = createDatabase();

      await db.init();

      db.createCollection("users");

      await db.flush();
      expect(await persistence.read()).to.deep.equal({ users: {} });

      persistence.enableEmitWriteError();

      db.createCollection("items");

      await expectRejects(() => db.flush(), AggregateError);

      await expectRejects(
        () => db.collection("users"),
        DatabaseNotInitializedError,
      );

      await db.init();
      expect(db.collection("users")).to.exist;
    });
  });

  it("cannot guarantee the final persisted state if persistence writes do not preserve call order", async () => {
    let writeCount = 0;
    let persistedData: DatabaseContent = {};

    const persistence = {
      readDatabaseContentFunc: async () => JSONObjectOps.clone(persistedData),

      writeDatabaseContentFunc: async (
        memoryJSONDB: DatabaseContent,
        resolve: () => void,
        reject: (reason?: unknown) => void,
      ) => {
        try {
          writeCount++;
          const currentWrite = writeCount;

          const snapshot = JSONObjectOps.clone(memoryJSONDB);

          await new Promise((r) =>
            setTimeout(r, currentWrite === 1 ? 100 : 10),
          );

          persistedData = snapshot;
          resolve();
        } catch (e) {
          reject(e);
        }
      },
    };

    const db = new MemongoDatabase(persistence, 10);

    await db.init();

    db.createCollection("users");
    db.collection("users")!.add({ _id: "0", name: "old" });
    await new Promise((r) => setTimeout(r, 20));
    db.collection("users")!.update({ name: "new" });

    await db.flush();

    expect(persistedData).to.deep.equal({ users: { "0": { name: "old" } } });
  });
});
