import type {
  DatabaseNotInitializedError,
  CollectionAlreadyExistsError,
  CollectionNotExistsError,
} from "../errors.js";
import type { Collection, CollectionContent } from "./collection.js";

export type DatabaseContent = { [key: string]: CollectionContent };

export type ReadDatabaseContentFunc = () => Promise<DatabaseContent>;
export type WriteDatabaseContentFunc = (
  databaseContent: DatabaseContent,
  resolve: any,
  reject: any,
) => Promise<void>;
export type Persistence = {
  readDatabaseContentFunc: ReadDatabaseContentFunc;
  writeDatabaseContentFunc: WriteDatabaseContentFunc;
};

export interface Database {
  /**
   * Should be called before any operation on the database.
   */
  init(): Promise<void>;

  /**
   * Waits for all pending writes to complete and reports any accumulated errors.
   *
   * @remarks
   * - Resolves only after all scheduled writes have finished.
   * - If any write errors occurred, they are aggregated and thrown as an `AggregateError`.
   * - After throwing, the internal error state is cleared and the database is marked as uninitialized.
   *
   * @throws {AggregateError} If one or more write operations failed.
   */
  flush(): Promise<void>;

  /**
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   * - {@link CollectionAlreadyExistsError}: When the collection already exists
   */
  createCollection(name: string): Collection;

  /**
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   * - {@link CollectionNotExistsError}: When the collection does not exist
   */
  removeCollection(name: string): void;

  /**
   * @returns returns `null` if the collection does not exist
   *
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   */
  collection(name: string): Collection | null;
}
