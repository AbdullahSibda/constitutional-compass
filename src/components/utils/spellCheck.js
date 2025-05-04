import Typo from 'typo-js';

let dictionary;
let dictionaryInitialized = false;

export const initializeDictionary = async () => {
  if (dictionaryInitialized) return dictionary;
  
  try {
    // Use absolute paths from the public directory
    const [aff, dic] = await Promise.all([
      fetch('/dictionaries/en_GB.aff').then(res => {
        if (!res.ok) throw new Error('Failed to load aff file');
        return res.text();
      }),
      fetch('/dictionaries/en_GB.dic').then(res => {
        if (!res.ok) throw new Error('Failed to load dic file');
        return res.text();
      }),
    ]);

    dictionary = new Typo('en_GB', aff, dic, {
      platform: 'any',
    });
    dictionaryInitialized = true;
    return dictionary;
  } catch (error) {
    console.error('Dictionary initialization failed:', error);
    throw error;
  }
};

export const hasMisspelledWords = async (query) => {
  if (!query || typeof query !== 'string') return false;
  
  try {
    const dict = await initializeDictionary();
    const words = query.split(/\s+/);

    for (const word of words) {
      if (!word.trim()) continue;
      
      const subWords = word.split(/[-_]/);
      for (const subWord of subWords) {
        if (subWord && !dict.check(subWord)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Spell check failed:', error);
    return false;
  }
};