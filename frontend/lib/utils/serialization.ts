/**
 * BigInt serialization utilities
 * Handles JSON serialization of BigInt values
 */

type Serializable = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Serializable[] 
  | { [key: string]: Serializable } 
  | bigint
  | Date;

// Replacer function for JSON.stringify to handle BigInt values
export function replacer(key: string, value: Serializable): Serializable {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

// Safe JSON stringify that handles BigInt
export function safeStringify(obj: unknown, indent?: number): string {
  return JSON.stringify(obj, replacer as (key: string, value: unknown) => unknown, indent);
}

// Reviver function for JSON.parse to handle BigInt values
export function reviver(key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    return new Date(value);
  }
  return value;
}

// Safe JSON parse that handles BigInt
export function safeParse<T = unknown>(jsonString: string): T {
  return JSON.parse(jsonString, reviver as (key: string, value: unknown) => unknown) as T;
}
