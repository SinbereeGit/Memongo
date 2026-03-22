import type {
  Document,
  DocumentContent,
  DocumentContentWithId,
  DocumentRoot,
} from "../../types/document.js";
import type { JSONUpdate } from "../../types/json.js";

import { JSONObjectOps } from "../json/json-object-ops.js";

export class MemongoDocument implements Document {
  _root: DocumentRoot;
  _id: string;
  _content: DocumentContent;

  constructor(root: DocumentRoot, id: string, content: DocumentContent) {
    this._root = root;
    this._id = id;
    this._content = content;
  }

  static getDocWithId(doc: DocumentContent, id: string): DocumentContentWithId {
    const docCopy = JSONObjectOps.clone(doc);
    return { ...docCopy, _id: id };
  }

  get(): DocumentContentWithId {
    return MemongoDocument.getDocWithId(this._content, this._id);
  }

  update(update: JSONUpdate): void {
    const copy = JSONObjectOps.clone(this._content);

    JSONObjectOps.update(copy, update);
    JSONObjectOps.update(this._content, update);

    this._root.write();
  }

  remove(): void {
    this._root.removeById(this._id);
  }
}
