import { describe, expect, it } from 'vitest';

import { parsePdfFilename } from '../src/filename.js';

describe('parsePdfFilename', () => {
  it.each([
    ['ГП.01 Гражданское право (РПД).pdf', 'ГП.01', 'Гражданское право'],
    ['ГП.02 Корпоративное право РПД.pdf', 'ГП.02', 'Корпоративное право'],
    ['Б1.О.01 Теория государства (РПД) (1).PDF', 'Б1.О.01', 'Теория государства'],
    ['  МДК.01.02   Договорное   право   (РПД)  .pdf', 'МДК.01.02', 'Договорное право'],
    ['История российского права (РПД).pdf', null, 'История российского права'],
  ])('parses %s without changing the source filename', (filename, code, name) => {
    const source = filename;

    expect(parsePdfFilename(filename)).toEqual({ code, name });
    expect(filename).toBe(source);
  });
});
