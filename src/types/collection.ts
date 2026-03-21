import type { QueryCommand } from "./query-command.js";
import type {
  Document,
  DocumentContent,
  DocumentContentWithId,
  DocumentContentWithOptionalId,
} from "./document.js";
import type { JSONPath, JSONUpdate, JSONValue } from "./json.js";
import type {
  DocumentAlreadyExistsError,
  DocumentNotExistsError,
  IncomparableValueError,
} from "../errors.js";
import type { JSONObjectOps } from "../core/json/json-object-ops.js";

export type CollectionContent = { [key: string]: DocumentContent };

export type OrderType = "asc" | "desc";

export interface CollectionQueryOptions {
  orderBy?: Array<{
    field: string;
    order: OrderType;
  }>;
  skip?: number;
  limit?: number;
}

export interface CollectionRoot {
  write(): Promise<void>;
}

export type QueryLeaf = JSONValue | RegExp | QueryCommand;
export type QueryCondition =
  | QueryLeaf
  | {
      [key: string]: QueryCondition;
    }
  | QueryCondition[];
export type WhereConditions = { [key: string]: QueryCondition };

export interface Collection {
  /**
   * Uses `_id` if provided; otherwise generates one.
   *
   * @throws
   * - {@link DocumentAlreadyExistsError}: If `_id` already exists.
   */
  add(data: DocumentContentWithOptionalId): Promise<{ _id: string }>;

  /**
   * @throws
   * - {@link DocumentNotExistsError}: If the document does not exist.
   */
  doc(id: string): Document;

  where(conditions: WhereConditions): Collection;

  limit(limit: number): Collection;

  skip(skip: number): Collection;

  /**
   * Sorting currently supports only string and number values.
   * Multiple calls accumulate sort rules in order.
   *
   * @param order - defaults to `"asc"`
   */
  orderBy(field: JSONPath, order?: OrderType): Collection;

  count(): number;

  /**
   * @throws
   * - {@link IncomparableValueError}: If sorting encounters values that cannot be compared.
   */
  get(): DocumentContentWithId[];

  /**
   * This operation is transactional: if it throws, nothing changes.
   *
   * @throws Propagates errors thrown by {@link JSONObjectOps.update}.
   */
  update(update: JSONUpdate): Promise<void>;

  remove(): Promise<void>;

  removeById(id: string): Promise<void>;

  write(): Promise<void>;
}
