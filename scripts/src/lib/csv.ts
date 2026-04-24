import fs from 'node:fs';
import { parse } from 'csv-parse';
import iconv from 'iconv-lite';

export interface CsvIteratorOptions {
  encoding?: string;
  columns?: boolean | string[];
}

export function iterateCsv<T = Record<string, string>>(
  path: string,
  options: CsvIteratorOptions = {},
): AsyncIterable<T> {
  const { encoding = 'euc-kr', columns = true } = options;

  const parser = fs
    .createReadStream(path)
    .pipe(iconv.decodeStream(encoding))
    .pipe(
      parse({
        columns,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      }),
    );

  return parser as unknown as AsyncIterable<T>;
}
