import type {
  Database,
  DatabaseContent,
  ReadDatabaseContentFunc,
  WriteDatabaseContentFunc,
} from "../../types/database.js";
import type { Collection, CollectionRoot } from "../../types/collection.js";

import {
  CollectionAlreadyExistsError,
  CollectionNotExistsError,
  DatabaseNotInitializedError,
} from "../../errors.js";
import { MemongoCollection } from "./collection.js";

export class MemongoDatabase implements Database, CollectionRoot {
  _hasInit: boolean = false;
  _memoryJSONDB: DatabaseContent = {};
  _dirty: boolean = false;
  _debounceDelay: number;
  _readDatabaseContentFunc: ReadDatabaseContentFunc;
  _writeDatabaseContentFunc: WriteDatabaseContentFunc;

  /**
   * @param persistence - if not provided, the database will be in pure-memory mode
   * @param debounceDelay - delay for debouncing writes to the storage, in milliseconds. Default is 200ms. Ignored in pure-memory mode.
   */
  constructor(
    persistence?: {
      readDatabaseContentFunc: ReadDatabaseContentFunc;
      writeDatabaseContentFunc: WriteDatabaseContentFunc;
    },
    debounceDelay: number = 200,
  ) {
    if (!persistence) {
      let storedData: DatabaseContent = {};
      persistence = {
        readDatabaseContentFunc: () => Promise.resolve(storedData),
        writeDatabaseContentFunc: () => Promise.resolve(),
      };
      debounceDelay = 0;
    }

    this._readDatabaseContentFunc = persistence.readDatabaseContentFunc;
    this._writeDatabaseContentFunc = persistence.writeDatabaseContentFunc;
    this._debounceDelay = debounceDelay;
  }

  async init(): Promise<void> {
    if (!this._hasInit) {
      this._memoryJSONDB = await this._readDatabaseContentFunc();
      this._hasInit = true;
    }
  }

  /**
   * With debouncing to avoid excessive writes when multiple operations are performed in a short period of time.
   */
  write(): Promise<void> {
    if (this._debounceDelay === 0) return Promise.resolve();

    this._dirty = true;

    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        if (!this._dirty) return resolve();

        this._dirty = false;

        const wrappedReject = (error: any) => {
          this._hasInit = false;
          reject(error);
        };

        await this._writeDatabaseContentFunc(
          this._memoryJSONDB,
          resolve,
          wrappedReject,
        );
      }, this._debounceDelay);
    });
  }

  async createCollection(name: string): Promise<Collection> {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    if (this._memoryJSONDB[name]) throw new CollectionAlreadyExistsError(name);

    this._memoryJSONDB[name] = {};

    await this.write();

    return new MemongoCollection(this, this._memoryJSONDB[name]);
  }

  async removeCollection(name: string): Promise<void> {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    if (!this._memoryJSONDB[name]) throw new CollectionNotExistsError(name);

    delete this._memoryJSONDB[name];

    await this.write();
  }

  collection(name: string): Collection | null {
    if (!this._hasInit) throw new DatabaseNotInitializedError();

    return this._memoryJSONDB[name]
      ? new MemongoCollection(this, this._memoryJSONDB[name])
      : null;
  }
}
