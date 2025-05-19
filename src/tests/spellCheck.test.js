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

  test('initializeDictionary loads dictionary successfully', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const dict = await initializeDictionary();
    expect(fetch).toHaveBeenCalledWith('/dictionaries/en_GB.aff');
    expect(fetch).toHaveBeenCalledWith('/dictionaries/en_GB.dic');
    expect(Typo).toHaveBeenCalledWith('en_GB', 'aff data', 'dic data', { platform: 'any' });
    expect(dict).toBeInstanceOf(Typo);
  });

  test('initializeDictionary caches dictionary', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url.includes('.aff') ? 'aff data' : 'dic data'),
      })
    );

    const dict1 = await initializeDictionary();
    const dict2 = await initializeDictionary();
    expect(dict1).toBe(dict2); // Same instance
    expect(fetch).toHaveBeenCalledTimes(2); // Called for .aff and .dic
  });

  test('initializeDictionary throws error on failed fetch', async () => {
    fetch.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    await expect(initializeDictionary()).rejects.toThrow('Network error');
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

  test('hasMisspelledWords handles dictionary initialization failure', async () => {
    fetch.mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    const result = await hasMisspelledWords('hello typo');
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