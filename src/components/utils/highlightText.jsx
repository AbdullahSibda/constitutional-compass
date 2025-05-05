export const highlightText = (text, query) => {
  if (!query || !text) return text;

  
  const searchTerms = query.match(/"([^"]+)"|\S+/g) || [];
  
  const cleanedTerms = searchTerms.map(term => 
    term.replace(/"/g, '').trim()
  ).filter(term => term.length > 0);

  if (cleanedTerms.length === 0) return text;

  const regex = new RegExp(
    `(${cleanedTerms.map(term => 
      term.split(/\s+/).length > 1 
        ? term 
        : `\\b${term}\\b` 
    ).join('|')})`,
    'gi'
  );


  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    const isMatch = cleanedTerms.some(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(part)
    );
    return isMatch ? <mark key={index}>{part}</mark> : part;
  });
};