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
    expect(await db.createCollection("users")).to.exist;
    await db.removeCollection("users");
    expect(db.collection("users")).to.not.exist;
  });

  function createFakePersistence() {
    let storedData: DatabaseContent = {};
    return {
      _emitWriteError: false,
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
      1, // for testing purposes, set write debounce to 1ms to speed up tests that involve multiple writes
    );
    return { db, persistence };
  }

  describe(`${MemongoDatabase.prototype.init.name}`, function () {
    it("initializes the database and allows operations afterwards", async function () {
      const { db } = createDatabase();

      await db.init();

      expect(await db.createCollection("users")).to.exist;
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

      expect(await db.createCollection("users")).to.exist;
    });
  });

  describe(`${MemongoDatabase.prototype.createCollection.name}`, function () {
    it("creates a new collection that can be retrieved", async function () {
      const { db } = createDatabase();

      await db.init();

      expect(await db.createCollection("users")).to.exist;
      expect(db.collection("users")).to.exist;
    });

    it("writes the new collection to persistence", async function () {
      const persistence = createFakePersistence();
      const { db } = createDatabase(persistence);
      await db.init();
      await db.createCollection("users");
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

        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
      });

      it(`throws ${CollectionAlreadyExistsError.name} if collection already exists, and persistence is unchanged`, async function () {
        const { db, persistence } = createDatabase();

        await db.init();
        await db.createCollection("users");

        const persistedBefore = await persistence.read();

        await expectRejects(
          () => db.createCollection("users"),
          CollectionAlreadyExistsError,
        );

        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
        await db.createCollection("items");
      });

      it("write failure resets initialization state and requires re-init", async function () {
        const { db, persistence } = createDatabase();

        await db.init();
        persistence.enableEmitWriteError();

        await expectRejects(() => db.createCollection("items"));

        persistence.disableEmitWriteError();
        await expectRejects(
          () => db.createCollection("users"),
          DatabaseNotInitializedError,
        );
      });
    });
  });

  describe(`${MemongoDatabase.prototype.removeCollection.name}`, function () {
    it("removes a collection so it can no longer be retrieved", async function () {
      const { db } = createDatabase();

      await db.init();
      await db.createCollection("users");

      expect(db.collection("users")).to.exist;

      await db.removeCollection("users");

      expect(db.collection("users")).to.be.null;
    });

    it("writes the removal to persistence", async function () {
      const { db, persistence } = createDatabase();

      await db.init();
      await db.createCollection("users");
      expect(await persistence.read()).to.deep.equal({ users: {} });

      await db.removeCollection("users");
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

        const persistedAfter = await persistence.read();
        expect(persistedAfter).to.deep.equal(persistedBefore);
      });

      it("write failure resets initialization state and requires re-init", async function () {
        const { db, persistence } = createDatabase();

        await db.init();
        await db.createCollection("users");

        persistence.enableEmitWriteError();

        await expectRejects(() => db.removeCollection("users"));

        persistence.disableEmitWriteError();
        await expectRejects(
          () => db.createCollection("items"),
          DatabaseNotInitializedError,
        );
      });
    });
  });

  describe(`${MemongoDatabase.prototype.collection.name}`, function () {
    it("returns a collection object for an existing collection", async function () {
      const { db } = createDatabase();

      await db.init();
      await db.createCollection("users");

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
});
