import type { CatalogDocument } from '@rpd/shared';

export const bachelorCourses = [1, 2, 3, 4, 5] as const;
export const masterCourses = [1, 2] as const;
export const masterPrograms = [
  { slug: 'corporate-law', name: 'Корпоративное право' },
  { slug: 'business-legal-support', name: 'Правовое сопровождение бизнеса' },
] as const;
export type MasterProgram = (typeof masterPrograms)[number]['slug'];
export const documentsForCourse = (documents: readonly CatalogDocument[], level: CatalogDocument['level'], program: CatalogDocument['program'], course: number) => documents.filter((item) => item.level === level && item.program === program && item.course === course);
export const findDocument = (documents: readonly CatalogDocument[], id: string) => documents.find((item) => item.id === id);
export const isMasterProgram = (value: string | undefined): value is MasterProgram => masterPrograms.some(({ slug }) => slug === value);
