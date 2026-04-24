import 'dotenv/config';

export function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export function getOptionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}
