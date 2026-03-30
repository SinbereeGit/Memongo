import type {
  Collection,
  CollectionContent,
  CollectionQueryOptions,
  CollectionRoot,
  OrderType,
  QueryCondition,
  WhereConditions,
} from "../../types/collection.js";
import type {
  JSONObject,
  JSONPath,
  JSONUpdate,
  JSONValueOrUndefined,
} from "../../types/json.js";
import type {
  Document,
  DocumentContent,
  DocumentContentWithId,
  DocumentContentWithOptionalId,
  DocumentRoot,
} from "../../types/document.js";

import { MemongoDocument } from "./document.js";
import {
  DocumentAlreadyExistsError,
  DocumentNotExistsError,
  IncomparableValueError,
} from "../../errors.js";
import { isJSONContainer } from "../json/json-guards.js";
import { JSONObjectOps } from "../json/json-object-ops.js";
import { MemongoQueryCommand } from "./query-command.js";

export class MemongoCollection implements Collection, DocumentRoot {
  _root: CollectionRoot;
  _content: CollectionContent;
  _queryOptions: CollectionQueryOptions;

  constructor(
    root: CollectionRoot,
    content: CollectionContent,
    options?: CollectionQueryOptions,
  ) {
    this._root = root;
    this._content = content;
    this._queryOptions = options ?? {};
  }

  add(data: DocumentContentWithOptionalId): { _id: string } {
    const generateRandomID = () => {
      let id = "";
      const map =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      while (!id || this._content[id]) {
        for (let i = 0; i < 4; i++) id += map[Math.floor(Math.random() * 62)];
      }
      return id;
    };

    if (data._id && this._content[data._id])
      throw new DocumentAlreadyExistsError();

    const clone = JSONObjectOps.clone(data);
    delete clone._id;
    const id = data._id || generateRandomID();
    this._content[id] = clone;

    this.write();

    return { _id: id };
  }

  doc(id: string): Document {
    const content = this._content[id];

    if (content === undefined) throw new DocumentNotExistsError();

    return new MemongoDocument(this, id, content);
  }

  where(conditions: WhereConditions): Collection {
    // TODO: the implementation of where sucks all now
    const match = (value: JSONValueOrUndefined, condition: QueryCondition) => {
      if (condition instanceof MemongoQueryCommand) {
        return condition.exec(value);
      }

      if (condition instanceof RegExp) {
        if (typeof value !== "string") return false;
        return condition.test(value);
      }

      if (condition && typeof condition === "object") {
        if (!isJSONContainer(value)) return false;

        for (const key of Object.keys(condition)) {
          if (
            !match(
              (value as JSONObject)[key],
              (condition as JSONObject)[key] as QueryCondition,
            )
          ) {
            // TODO: this way sucks...
            return false;
          }
        }

        return true;
      }

      return value === condition;
    };

    const testDoc = (key: string): boolean => {
      for (const keyInConditions of Object.keys(conditions)) {
        const docValueUnderTest =
          keyInConditions === "_id"
            ? key
            : JSONObjectOps.getByPath(this._content[key]!, keyInConditions);
        if (!match(docValueUnderTest, conditions[keyInConditions]!))
          return false;
      }
      return true;
    };

    const res: CollectionContent = {};

    Object.keys(this._content).forEach(
      (key) => testDoc(key) && (res[key] = this._content[key]!),
    );

    return new MemongoCollection(this._root, res, this._queryOptions);
  }

  limit(limit: number): Collection {
    const options = JSONObjectOps.clone(this._queryOptions as JSONObject);
    options.limit = limit;
    return new MemongoCollection(this._root, this._content, options);
  }

  skip(skip: number): Collection {
    const options = JSONObjectOps.clone(this._queryOptions as JSONObject);
    options.skip = skip;
    return new MemongoCollection(this._root, this._content, options);
  }

  orderBy(field: JSONPath, order: OrderType = "asc"): Collection {
    const options = JSONObjectOps.clone(
      this._queryOptions as JSONObject,
    ) as typeof this._queryOptions;
    if (!options.orderBy) options.orderBy = [];
    options.orderBy.push({
      field,
      order,
    });
    return new MemongoCollection(this._root, this._content, options);
  }

  count(): number {
    return Object.keys(this._content).length;
  }

  get(): DocumentContentWithId[] {
    const res: DocumentContentWithId[] = [];

    const add = (key: string) =>
      res.push(
        MemongoDocument.getDocWithId(
          this._content[key] as DocumentContent,
          key,
        ),
      );

    const compare = (a: JSONValueOrUndefined, b: JSONValueOrUndefined) => {
      if (a === b) return 0;

      if (typeof a === "string" && typeof b === "string")
        return a.localeCompare(b);

      if (typeof a === "number" && typeof b === "number") return a > b ? 1 : -1;

      throw new IncomparableValueError(a, b);
    };

    Object.keys(this._content).forEach((key) => add(key));

    const orderBy = this._queryOptions.orderBy;
    if (orderBy?.length)
      res.sort((a, b) => {
        let result = 0;
        for (const item of orderBy) {
          const valueOfA = JSONObjectOps.getByPath(a, item.field),
            valueOfB = JSONObjectOps.getByPath(b, item.field);
          result = compare(valueOfA, valueOfB);
          if (!result) continue;
          return (item.order == "desc" ? -1 : 1) * result;
        }
        return 0;
      });

    const { skip = 0, limit } = this._queryOptions;
    res.splice(0, skip);
    if (limit != null) res.splice(limit);

    return res;
  }

  update(update: JSONUpdate): void {
    const copy = JSONObjectOps.clone(this._content);

    Object.values(copy).forEach((documentContent) =>
      JSONObjectOps.update(documentContent, update),
    );
    Object.values(this._content).forEach((documentContent) =>
      JSONObjectOps.update(documentContent, update),
    );

    this.write();
  }

  remove(): void {
    Object.keys(this._content).forEach((key) => delete this._content[key]);

    this.write();
  }

  removeById(id: string): void {
    if (!this._content[id]) throw new DocumentNotExistsError();

    delete this._content[id];

    this.write();
  }

  write(): void {
    this._root.write();
  }
}
