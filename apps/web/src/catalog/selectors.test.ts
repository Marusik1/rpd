import { describe, expect, it } from 'vitest';
import { bachelorCourses, documentsForCourse, findDocument, masterPrograms } from './selectors.js';

describe('catalog selectors', () => {
  it('exposes structural education navigation even for an empty catalog', () => {
    expect(bachelorCourses).toEqual([1, 2, 3, 4, 5]);
    expect(masterPrograms.map(({ slug }) => slug)).toEqual(['corporate-law', 'business-legal-support']);
  });
  it('selects documents exclusively from catalog records', () => {
    const records = [{ id: 'one', level: 'bachelor', program: null, course: 2, code: null, name: 'Документ', filename: 'Документ.pdf', path: 'documents/bachelor/2/Документ.pdf' }] as const;
    expect(documentsForCourse(records, 'bachelor', null, 2)).toEqual(records);
    expect(documentsForCourse(records, 'bachelor', null, 1)).toEqual([]);
    expect(findDocument(records, 'one')).toEqual(records[0]);
    expect(findDocument(records, 'stale')).toBeUndefined();
  });
});
