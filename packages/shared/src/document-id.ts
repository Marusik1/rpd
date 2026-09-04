export type DocumentIdentityFields = {
  level: 'bachelor' | 'master';
  program: 'corporate-law' | 'business-legal-support' | null;
  course: number;
  filename: string;
};

const normalize = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ru-RU');

function digest(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0').slice(-12);
}

export function createDocumentId(fields: DocumentIdentityFields): string {
  const structural = [fields.level, fields.program ?? '-', String(fields.course), normalize(fields.filename)];
  const prefix = [fields.level, fields.program, fields.course].filter(Boolean).join('-');
  return `${prefix}-${digest(structural.join('\u0000'))}`;
}
