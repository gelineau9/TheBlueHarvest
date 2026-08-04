/**
 * Converting stored rich text into plain text for previews, card summaries and
 * emptiness checks.
 *
 * Call sites used to do `.replace(/<[^>]*>/g, '')` inline, which had three
 * problems: HTML entities survived (so `&nbsp;` and `&amp;` rendered literally),
 * removing tags with an empty string glued neighbouring words together
 * (`<p>One</p><p>Two</p>` → "OneTwo"), and a body of only `&nbsp;` counted as
 * non-empty in validation.
 */

/** Entities Tiptap and pasted content actually produce. Numeric refs cover the rest. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  shy: '',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  bull: '•',
  middot: '·',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  dagger: '†',
  prime: '′',
  Prime: '″',

  // Accented Latin-1 — pasted character names rely on these (Créa, Númenórean)
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  yuml: 'ÿ',
  szlig: 'ß',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  Oslash: 'Ø',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  Yacute: 'Ý',
};

/**
 * Decodes named and numeric character references in a single pass, so an
 * already-escaped sequence like `&amp;lt;` correctly yields `&lt;` rather than
 * being decoded twice into `<`.
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#[Xx]?[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    // Named lookup is case-sensitive first (&Prime vs &prime), then forgiving
    return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Rich text → readable plain text. Safe on null/undefined.
 * Tags become spaces so words aren't joined, then whitespace is collapsed.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when rich text has no visible content (only tags, entities or whitespace). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  return htmlToPlainText(html).length === 0;
}
