export type ModuleLoader = (specifier: string) => Promise<unknown>;

export const dynamicModuleLoader: ModuleLoader = (specifier) => import(specifier);

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(handle);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(handle);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
