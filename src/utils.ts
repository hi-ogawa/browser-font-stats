export type Result<T, E> = { ok: true; value: T } | { ok: false; value: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<T>(value: T): Result<never, T> {
  return { ok: false, value };
}

export function wrapError<T>(value: () => T): Result<T, unknown> {
  try {
    return Ok(value());
  } catch (e) {
    return Err(e);
  }
}

export async function wrapReject<T>(
  value: Promise<T>
): Promise<Result<T, unknown>> {
  try {
    return Ok(await value);
  } catch (e) {
    return Err(e);
  }
}

export function DefaultDict<T>(defaultFactory: () => T): Record<string, T> {
  return new Proxy<Record<string, T>>(
    {},
    {
      get: (target, p: string) => {
        if (!(p in target)) {
          target[p] = defaultFactory();
        }
        return target[p];
      },
    }
  );
}
