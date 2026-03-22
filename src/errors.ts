export class MemongoError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message ?? new.target.name, options);
    this.name = new.target.name;
  }
}

export class PersistenceError extends MemongoError {
  constructor(error: unknown) {
    super("Persistence operation failed", { cause: error });
  }
}

export class DatabaseNotInitializedError extends MemongoError {}
export class CollectionAlreadyExistsError extends MemongoError {
  constructor(name: string) {
    super(`Collection "${name}" already exists.`);
  }
}
export class CollectionNotExistsError extends MemongoError {
  constructor(name: string) {
    super(`Collection "${name}" does not exist.`);
  }
}
export class DocumentAlreadyExistsError extends MemongoError {}
export class DocumentNotExistsError extends MemongoError {}

export class PathConflictError extends MemongoError {
  constructor(path: string, key: string) {
    super(`Cannot set path "${path}": invalid segment "${key}".`);
  }
}
export class IncomparableValueError extends MemongoError {
  constructor(a: unknown, b: unknown) {
    super(`Incomparable values during sorting: ${a} vs ${b}`);
  }
}
