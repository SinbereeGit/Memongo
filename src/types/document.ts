import type { JSONObjectOps } from "../core/json/json-object-ops.js";
import type { JSONObject, JSONUpdate } from "./json.js";

export type DocumentContent = JSONObject;
export type DocumentContentWithId = DocumentContent & { _id: string };
export type DocumentContentWithOptionalId = DocumentContent & { _id?: string };

export interface DocumentRoot {
  removeById(id: string): Promise<void>;
  write(): Promise<void>;
}

export interface Document {
  get(): DocumentContentWithId;

  /**
   * This operation is transactional: if it throws, nothing changes.
   *
   * @throws Propagates errors thrown by {@link JSONObjectOps.update}.
   */
  update(update: JSONUpdate): Promise<void>;

  remove(): Promise<void>;

  write(): Promise<void>;
}
