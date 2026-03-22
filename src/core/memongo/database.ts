import type {
  Database,
  DatabaseContent,
  Persistence,
} from "../../types/database.js";
import type { Collection, CollectionRoot } from "../../types/collection.js";

import {
  CollectionAlreadyExistsError,
  CollectionNotExistsError,
  DatabaseNotInitializedError,
  PersistenceError,
} from "../../errors.js";
import { MemongoCollection } from "./collection.js";

export class MemongoDatabase implements Database, CollectionRoot {
  _hasInit: boolean = false;
  _memoryJSONDB: DatabaseContent = {};
  _dirty: boolean = false;
  _debounceDelay: number;
  _isPureMemoryMode: boolean = false;
  _persistence: Persistence;
  _pendingWrites: Promise<void>[] = [];
  _errorsRecord: Error[] = [];

  /**
   * @param persistence - if not provided, the database will be in pure-memory mode
   * @param debounceDelay - delay for debouncing writes to the storage, in milliseconds. Default is 200ms. Ignored in pure-memory mode.
   */
  constructor(persistence?: Persistence, debounceDelay: number = 200) {
    if (!persistence) {
      let storedData: DatabaseContent = {};
      persistence = {
        readDatabaseContentFunc: () => Promise.resolve(storedData),
        writeDatabaseContentFunc: () => Promise.resolve(),
      };
      this._isPureMemoryMode = true;
    }

    this._persistence = persistence;
    this._debounceDelay = debounceDelay;
  }

  async init(): Promise<void> {
    if (!this._hasInit) {
      this._memoryJSONDB = await this._persistence.readDatabaseContentFunc();
      this._hasInit = true;
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this._pendingWrites);
    this._pendingWrites = [];
    if (this._errorsRecord.length > 0) {
      const errors = this._errorsRecord;
      this._errorsRecord = [];
      this._hasInit = false;
      throw new AggregateError(errors);
    }
  }

  /**
   * Schedules an asynchronous persistence write for the current database state.
   */
  write(): void {
    this._pendingWrites.push(this._writeToPersistance());
  }

  /**
   * Records any errors that occur during the write process in property {@link _errorsRecord}.
   *
   * With debouncing to avoid excessive writes when multiple operations are performed in a short period of time.
   *
   * In pure-memory mode, this method resolves immediately without performing any operations.
   */
  _writeToPersistance(): Promise<void> {
    if (this._isPureMemoryMode) return Promise.resolve();

    this._dirty = true;

    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        if (!this._dirty) return resolve();

        this._dirty = false;

        await this._persistence.writeDatabaseContentFunc(
          this._memoryJSONDB,
          resolve,
          reject,
        );
      }, this._debounceDelay);
    }).catch((e) => {
      this._errorsRecord.push(new PersistenceError(e));
    });
  }

  createCollection(name: string): Collection {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    if (this._memoryJSONDB[name]) throw new CollectionAlreadyExistsError(name);

    this._memoryJSONDB[name] = {};

    this.write();

    return new MemongoCollection(this, this._memoryJSONDB[name]);
  }

  removeCollection(name: string): void {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    if (!this._memoryJSONDB[name]) throw new CollectionNotExistsError(name);

    delete this._memoryJSONDB[name];

    this.write();
  }

  collection(name: string): Collection | null {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    return this._memoryJSONDB[name]
      ? new MemongoCollection(this, this._memoryJSONDB[name])
      : null;
  }
}
