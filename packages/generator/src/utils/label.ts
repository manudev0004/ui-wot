export function formatLabelText(raw: any, opts?: { maxPerLine?: number; maxLines?: number }): string {
  const maxPerLine = opts?.maxPerLine ?? 24;
  const maxLines = opts?.maxLines ?? 2;
  const str = String(raw ?? '').trim();
  if (!str) return '';
  let s = str
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  s = s
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');

  const words = s.split(' ');
  const lines: string[] = [];
  let current = '';
  const push = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const w of words) {
    const tentative = current ? current + ' ' + w : w;
    if (tentative.length <= maxPerLine) {
      current = tentative;
    } else {
      push();
      if (lines.length >= maxLines - 1) {
        // last line: truncate whole remaining word with ellipsis
        const room = Math.max(1, maxPerLine - 1);
        const cut = w.length > room ? w.slice(0, room) : w;
        lines.push(cut + '…');
        return lines.slice(0, maxLines).join('\n');
      }
      // start a new line with this word, truncated if needed
      current = w.length <= maxPerLine ? w : w.slice(0, Math.max(1, maxPerLine - 1)) + '…';
    }
  }
  push();
  if (lines.length > maxLines) return lines.slice(0, maxLines).join('\n');
  return lines.join('\n');
}
