/**
 * Creates a strict view proxy that exposes only the specified properties of the original object.
 *
 * The view allows reading, writing, and deleting the whitelisted properties. All other properties
 * are completely hidden: they are non-enumerable, inaccessible, and attempting to set or delete
 * them fail will throw. Property descriptor modification is disallowed—though technically possible—to
 * preserve view integrity, and the prototype chain is severed.
 *
 * @example
 *
 * ```typescript
 * const source = { name: 'Alice', age: 30, email: 'alice@example.com' };
 * Object.defineProperty(source, "doNotWriteMe", {
 *   value: "please!",
 *   writable: false,
 *   enumerable: true,
 *   configurable: true,
 * });
 * const view = createStrictView(source, ['name', 'age', 'doNotWriteMe']);
 *
 * // Allowed: read, write, delete
 * view.name;                 // 'Alice'
 * view.age = 31;             // updates source.age
 * delete view.age;           // removes age from source
 *
 * // Hidden: non-whitelisted properties are invisible
 * view.email;                // undefined
 * 'email' in view;           // false
 * Object.keys(view);         // ['name', 'doNotWriteMe'] (age deleted)
 *
 * // Rejected: attempts to mutate hidden properties fail (throws in strict mode)
 * view.email = 'new';        // TypeError
 * delete view.email;         // TypeError
 *
 * // Descriptor protection: cannot alter non-whitelisted property attributes
 * Object.defineProperty(view, 'email', { writable: false }); // TypeError
 *
 * // Descriptor change notice: this is technically possible but not recommended, as it can break the view's integrity.
 * Object.defineProperty(view, 'doNotWriteMe', { writable: true }); // strongly discouraged!
 *
 * // Prototype isolation: no inherited methods
 * Object.getPrototypeOf(view); // null
 * view.toString;              // undefined
 *
 * // Symbol support: whitelist may include symbols
 * const sym = Symbol('id');
 * const obj = { [sym]: 123, visible: 'ok' };
 * const v = createStrictView(obj, [sym, 'visible']);
 * v[sym];                    // 123
 * Object.getOwnPropertySymbols(v); // [sym]
 * ```
 */
export function createStrictView<
  T extends object,
  K extends keyof T
>(
  originalObj: T,
  allowedKeys: K[],
): Pick<T, K> {
  const keySet = new Set(allowedKeys as (string | symbol)[]);

  return new Proxy(originalObj, {
    get(target, prop, receiver) {
      if (keySet.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      return undefined;
    },

    set(target, prop, value, receiver) {
      if (keySet.has(prop)) {
        return Reflect.set(target, prop, value, receiver);
      }
      return false;
    },

    deleteProperty(target, prop) {
      if (keySet.has(prop)) {
        return Reflect.deleteProperty(target, prop);
      }
      return false;
    },

    has(target, prop) {
      return keySet.has(prop) && prop in target;
    },

    ownKeys(target) {
      return Array.from(keySet).filter((key) => key in target);
    },

    getOwnPropertyDescriptor(target, prop) {
      if (keySet.has(prop) && prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
      return undefined;
    },

    /**
     * 不要修改属性描述符, 即使这可以做到.
     */
    defineProperty(target, prop, descriptor) {
      if (keySet.has(prop)) {
        return Reflect.defineProperty(target, prop, descriptor);
      }
      return false;
    },

    getPrototypeOf(target) {
      return null;
    },
  });
}
