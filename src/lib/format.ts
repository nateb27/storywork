/**
 * Passage text helpers. Passages are plain text with blank lines
 * between paragraphs and *asterisks* for italics (book titles,
 * emphasis). Nothing else is interpreted.
 */

export type Run = { text: string; em: boolean };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Split a passage into paragraphs on blank lines. */
export function paragraphs(passage: string): string[] {
  return passage
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Split text into runs of plain and *italic* text. */
export function runs(text: string): Run[] {
  const out: Run[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), em: false });
    out.push({ text: m[1] ?? '', em: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), em: false });
  return out;
}

/** Render a paragraph to safe HTML: italics and single line breaks only. */
export function paragraphHtml(text: string): string {
  return runs(text)
    .map((r) => {
      const html = escapeHtml(r.text).replace(/\n/g, '<br>');
      return r.em ? `<em>${html}</em>` : html;
    })
    .join('');
}

/** Plain text with the asterisks removed (for word counts, meta). */
export function plain(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}

/* Abbreviations that end in a full stop but don't end a sentence */
const ABBREVIATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'St', 'Mt', 'Jr', 'Sr', 'Capt', 'Col', 'Gen', 'Rev', 'Prof', 'viz', 'etc', 'i.e', 'e.g'];

/**
 * Split a paragraph into sentences for copy mode's sentence-by-sentence
 * view. Keeps closing quotes and brackets with their sentence and
 * avoids breaking after common abbreviations and inside ellipses.
 */
export function sentences(paragraph: string): string[] {
  const out: string[] = [];
  const re = /([.!?]+|——|\. \. \.)([’”"')\]]*)(\s+)(?=[“"‘'(\[A-Z*])/g;
  let start = 0;
  for (let m = re.exec(paragraph); m; m = re.exec(paragraph)) {
    const end = m.index + m[1]!.length + m[2]!.length;
    const before = paragraph.slice(start, m.index);
    const lastWord = before.split(/\s+/).pop() ?? '';
    if (m[1] === '.' && ABBREVIATIONS.includes(lastWord.replace(/^[“"‘'(]/, ''))) continue;
    out.push(paragraph.slice(start, end));
    start = end + m[3]!.length;
  }
  if (start < paragraph.length) out.push(paragraph.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}
