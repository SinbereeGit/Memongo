import type { JSONValueOrUndefined } from "../../types/json.js";
import type { QueryCommand, QueryFunction } from "../../types/query-command.js";

export class MemongoQueryCommand<
  T extends JSONValueOrUndefined = JSONValueOrUndefined,
> implements QueryCommand<T> {
  _exec: QueryFunction<T>;

  constructor(func: QueryFunction<T>) {
    this._exec = func;
  }

  exec(val: T): boolean {
    return this._exec(val);
  }

  and(queryCommand: QueryCommand<T>): QueryCommand<T> {
    return new MemongoQueryCommand<T>(
      (val) => this.exec(val) && queryCommand.exec(val),
    );
  }

  or(queryCommand: QueryCommand<T>): QueryCommand<T> {
    return new MemongoQueryCommand<T>(
      (val) => this.exec(val) || queryCommand.exec(val),
    );
  }

  not(): QueryCommand<T> {
    return new MemongoQueryCommand<T>((val) => !this.exec(val));
  }
}
