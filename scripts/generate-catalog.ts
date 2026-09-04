import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { scanDocuments, serializeCatalog } from './lib/scan-documents.js';

const publicRoot = path.resolve('public');
const result = await scanDocuments(publicRoot);
for (const warning of result.warnings)
  console.warn(`warning [${warning.code}]: ${warning.paths.join(', ')}`);
await writeFile(path.join(publicRoot, 'catalog.json'), serializeCatalog(result.documents), 'utf8');
console.log(`generated catalog.json with ${result.documents.length} document(s)`);
