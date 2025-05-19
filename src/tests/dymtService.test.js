import { getCorrection } from '../api/thirdParty/dymtService'; 

// Mock the fetch API
global.fetch = jest.fn();

describe('getCorrection', () => {
  const mockText = 'teh';
  const apiKey = 'mock-api-key';

  // Set up environment variable mock
  beforeAll(() => {
    process.env.REACT_APP_DYMT_API_KEY = apiKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.REACT_APP_DYMT_API_KEY;
  });

  test('returns corrected text when API call is successful with correction', async () => {
    const mockResponse = {
      result: 'the',
      original_text: 'teh',
      is_modified: true,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await getCorrection(mockText);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(mockText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    // Debug Headers content
    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);

    expect(result).toEqual({
      corrected_text: 'the',
      original_text: 'teh',
      confidence: 0.95,
    });
  });

  test('returns original text when API call is successful with no correction', async () => {
    const mockResponse = {
      result: 'teh',
      original_text: 'teh',
      is_modified: false,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await getCorrection(mockText);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(mockText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);

    expect(result).toEqual({
      corrected_text: 'teh',
      original_text: 'teh',
      confidence: 0,
    });
  });

  test('falls back to input text when API response lacks fields', async () => {
    const mockResponse = {};

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await getCorrection(mockText);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(mockText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);

    expect(result).toEqual({
      corrected_text: mockText,
      original_text: mockText,
      confidence: 0,
    });
  });

  test('throws error when API returns non-200 status', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    await expect(getCorrection(mockText)).rejects.toThrow('Error 400: Bad Request');

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(mockText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);
  });

  test('throws error when network fails', async () => {
    const networkError = new Error('Network error');
    fetch.mockRejectedValueOnce(networkError);

    await expect(getCorrection(mockText)).rejects.toThrow('Failed to fetch correction: Network error');

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(mockText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);
  });

  test('encodes query string correctly', async () => {
    const complexText = 'teh word & more';
    const mockResponse = {
      result: 'the word & more',
      original_text: 'teh word & more',
      is_modified: true,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    await getCorrection(complexText);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=${encodeURIComponent(complexText)}`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);
  });

  test('handles empty input text', async () => {
    const mockResponse = {
      result: '',
      original_text: '',
      is_modified: false,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
    });

    const result = await getCorrection('');

    expect(fetch).toHaveBeenCalledWith(
      `https://api.apilayer.com/dymt/did_you_mean_this?q=`,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
        headers: expect.any(Headers),
      })
    );

    const fetchCall = fetch.mock.calls[0][1];
    expect(fetchCall.headers.get('apikey')).toBe(apiKey);

    expect(result).toEqual({
      corrected_text: '',
      original_text: '',
      confidence: 0,
    });
  });
});