export type ParsedPdfName = { code: string | null; name: string };

const collapseWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

export function parsePdfFilename(filename: string): ParsedPdfName {
  const stem = filename.replace(/\.pdf\s*$/iu, '');
  const cleaned = collapseWhitespace(
    stem
      .replace(/\s*\(\s*\d+\s*\)\s*$/u, '')
      .replace(/\s*(?:\(\s*РПД\s*\)|РПД)\s*$/iu, ''),
  );
  const match = /^(?<code>(?=[^\s]*\d)[А-ЯЁA-Z0-9]+(?:[.-][А-ЯЁA-Z0-9]+)*)\s+(?<name>.+)$/iu.exec(
    cleaned,
  );

  return match?.groups
    ? { code: match.groups.code ?? null, name: collapseWhitespace(match.groups.name ?? '') }
    : { code: null, name: cleaned };
}
