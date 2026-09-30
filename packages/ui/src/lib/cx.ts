export type ClassValue = string | number | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  let result = "";
  for (const value of values) {
    if (value === false || value === null || value === undefined || value === 0 || value === "") {
      continue;
    }
    result = result === "" ? String(value) : `${result} ${value}`;
  }
  return result;
}
