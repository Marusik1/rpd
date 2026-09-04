import { z } from 'zod';

const levelSchema = z.enum(['bachelor', 'master']);
const programSchema = z.enum(['corporate-law', 'business-legal-support']).nullable();

function isSafePosixDocumentPath(path: string): boolean {
  if (!path.startsWith('documents/') || path.includes('\\') || path.startsWith('/')) return false;
  if (/[?#]/u.test(path)) return false;
  const segments = path.split('/');
  if (segments.some((segment) => segment.length === 0)) return false;
  try {
    return segments.every((segment) => {
      const decoded = decodeURIComponent(segment);
      return decoded !== '.' && decoded !== '..' && !decoded.includes('/') && !decoded.includes('\\');
    });
  } catch {
    return false;
  }
}

export const CatalogDocumentSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]+$/u, 'Document ID must be URL-safe'),
    level: levelSchema,
    program: programSchema,
    course: z.number().int(),
    code: z.string().trim().min(1).nullable(),
    name: z.string().trim().min(1),
    filename: z.string().trim().min(1),
    path: z.string().trim().min(1),
  })
  .strict()
  .superRefine((document, context) => {
    if (document.filename.includes('/') || document.filename.includes('\\')) {
      context.addIssue({ code: 'custom', path: ['filename'], message: 'Filename must be a basename' });
    }
    if (document.level === 'bachelor' && document.program !== null) {
      context.addIssue({ code: 'custom', path: ['program'], message: 'Bachelor documents must not have a program' });
    }
    if (document.level === 'master' && document.program === null) {
      context.addIssue({ code: 'custom', path: ['program'], message: 'Master documents must have a program' });
    }
    if (document.level === 'bachelor' && (document.course < 1 || document.course > 5)) {
      context.addIssue({ code: 'custom', path: ['course'], message: 'Bachelor course must be between 1 and 5' });
    }
    if (document.level === 'master' && (document.course < 1 || document.course > 2)) {
      context.addIssue({ code: 'custom', path: ['course'], message: 'Master course must be between 1 and 2' });
    }

    if (!isSafePosixDocumentPath(document.path)) {
      context.addIssue({ code: 'custom', path: ['path'], message: 'Document path must be a safe POSIX relative path' });
      return;
    }
    const expected =
      document.level === 'bachelor'
        ? `documents/bachelor/${document.course}/${document.filename}`
        : `documents/master/${document.program ?? ''}/${document.course}/${document.filename}`;
    if (document.path !== expected) {
      context.addIssue({ code: 'custom', path: ['path'], message: 'Document path must match its structural fields and filename' });
    }
  });

export type CatalogDocument = z.infer<typeof CatalogDocumentSchema>;
export type CatalogValidationError = { path: PropertyKey[]; message: string; code: string };
export type CatalogValidationResult =
  | { success: true; data: CatalogDocument[] }
  | { success: false; errors: CatalogValidationError[] };

export function validateCatalogDocuments(input: unknown): CatalogValidationResult {
  const result = z.array(CatalogDocumentSchema).safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map(({ path, message, code }) => ({ path: [...path], message, code })),
  };
}

export function findDocumentIdCollisions(documents: readonly Pick<CatalogDocument, 'id'>[]): string[] {
  const seen = new Set<string>();
  const collisions = new Set<string>();
  for (const { id } of documents) {
    if (seen.has(id)) collisions.add(id);
    seen.add(id);
  }
  return [...collisions].sort();
}
