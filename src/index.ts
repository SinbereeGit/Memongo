import type {
  Database,
  ReadDatabaseContentFunc,
  WriteDatabaseContentFunc,
} from "./types/database.js";
import type { Collection } from "./types/collection.js";

import { update } from "./operators/update.js";
import { query } from "./operators/query.js";
import { MemongoDatabase } from "./core/memongo/database.js";

export * from "./errors.js";

/**
 * @param persistence - if not provided, the database will be in pure-memory mode
 * @param debounceDelay - delay for debouncing writes to the storage, in milliseconds. Default is 200ms. Ignored in pure-memory mode.
 */
export function createDatabase(
  persistence?: {
    readDatabaseContentFunc: ReadDatabaseContentFunc;
    writeDatabaseContentFunc: WriteDatabaseContentFunc;
  },
  debounceDelay: number = 200,
): Database {
  return new MemongoDatabase(persistence, debounceDelay);
}

/**
 * Helpers for building query conditions in {@link Collection.where} and update operations in {@link Collection.update}.
 */
export const command = {
  ...query,
  ...update,
};

export { JSONObjectOps, REMOVE } from "./core/json/json-object-ops.js";

export type * from "./public-types.js";
