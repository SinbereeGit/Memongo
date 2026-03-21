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

export interface Database {
  /**
   * Should be called before any operation on the database.
   */
  init(): Promise<void>;

  /**
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   * - {@link CollectionAlreadyExistsError}: When the collection already exists
   */
  createCollection(name: string): Promise<Collection>;

  /**
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   * - {@link CollectionNotExistsError}: When the collection does not exist
   */
  removeCollection(name: string): Promise<void>;

  /**
   * @returns returns `null` if the collection does not exist
   *
   * @throws
   * - {@link DatabaseNotInitializedError}: When the database is not initialized
   */
  collection(name: string): Collection | null;
}
