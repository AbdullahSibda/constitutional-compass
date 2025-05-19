export const highlightText = (text, query) => {
  if (!query || !text) return text;
  const searchTerms = query.match(/"([^"]+)"|\S+/g) || [];
  const cleanedTerms = searchTerms
    .map((term) => term.replace(/"/g, '').trim())
    .filter((term) => term.length > 0);
  if (cleanedTerms.length === 0) return text;
  const regex = new RegExp(
    `(${cleanedTerms
      .map((term) =>
        term.split(/\s+/).length > 1 ? term : `\\b${term}\\b`
      )
      .join('|')})`,
    'gi'
  );
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;
    const before = text.slice(lastIndex, matchStart);
    if (before) parts.push(before);
    parts.push(<mark key={parts.length}>{match[0]}</mark>);
    lastIndex = matchEnd;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.filter((part) => part !== null && part !== '');
};