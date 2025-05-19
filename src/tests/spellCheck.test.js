import { initializeDictionary, hasMisspelledWords } from '../components/utils/spellCheck';
import Typo from 'typo-js';

// Mock Typo-js
jest.mock('typo-js', () => {
  function MockTypo(lang, aff, dic) {
    this.check = jest.fn((word) => {
      const validWords = ['hello', 'world', 'test'];
      return validWords.includes(word.toLowerCase());
    });
  }
  return MockTypo;
});

// Mock fetch for dictionary files
global.fetch = jest.fn();

describe('initializeDictionary and hasMisspelledWords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset dictionary state
    jest.resetModules();
    global.fetch.mockReset();
  });

  test('hasMisspelledWords returns false for valid words', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const result = await hasMisspelledWords('hello world');
    expect(result).toBe(false);
  });

  test('hasMisspelledWords returns true for misspelled words', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const result = await hasMisspelledWords('hello typo');
    expect(result).toBe(true);
  });

  test('hasMisspelledWords handles hyphenated and underscored words', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const result = await hasMisspelledWords('hello-world test_typo');
    expect(result).toBe(true); // 'typo' is misspelled
  });

  test('hasMisspelledWords returns false for empty query', async () => {
    const result = await hasMisspelledWords('');
    expect(result).toBe(false);
  });

  test('hasMisspelledWords returns false for non-string query', async () => {
    const result = await hasMisspelledWords(null);
    expect(result).toBe(false);
  });

  test('hasMisspelledWords skips empty words', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const result = await hasMisspelledWords('hello   world  ');
    expect(result).toBe(false);
  });
});