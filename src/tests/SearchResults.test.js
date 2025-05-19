import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchResults from '../components/SearchResults/SearchResults';
import { highlightText } from '../components/utils/highlightText';

// Mock dependencies
jest.mock('../components/utils/highlightText', () => ({
  highlightText: jest.fn((text) => <span data-testid="highlighted-text">{text}<mark>{text}</mark></span>),
}));
jest.mock('../components/SearchResults/SearchResults.css', () => ({}));

// Mock URL for download tests
global.URL = {
  createObjectURL: jest.fn(() => 'blob://test'),
  revokeObjectURL: jest.fn(),
};

// Mock Date for consistent metadata dates
const OriginalDate = global.Date;
beforeAll(() => {
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length) {
        return new OriginalDate(...args);
      }
      return new OriginalDate('2025-05-18T12:00:00Z');
    }
    static now() {
      return new OriginalDate('2025-05-18T12:00:00Z').getTime();
    }
  };
});
afterAll(() => {
  global.Date = OriginalDate;
});

describe('SearchResults Component', () => {
  const mockResults = [
    {
      title: 'Document1.pdf',
      url: 'http://example.com/doc1.pdf',
      snippets: [
        { text: 'Sample text one', score: 0.2 },
        { text: 'Sample text two', score: 0.3 },
      ],
      metadata: { year: '2023', file_type: 'PDF', document_type: 'Report', publication_date: '2023-01-15T00:00:00Z' },
    },
    {
      title: 'Audio1.mp3',
      url: 'http://example.com/audio1.mp3',
      snippets: [{ text: 'Sample audio snippet', score: 0.4 }],
      metadata: { year: '2024', file_type: 'MP3', document_type: 'Recording' },
    },
    {
      title: 'NoMetadata.doc',
      url: 'http://example.com/nometadata.doc',
      snippets: [{ text: 'No metadata snippet', score: 0.1 }],
      metadata: {},
    },
  ];
  const mockQuery = 'sample';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders search results with correct details', () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Audio1.mp3')).toBeInTheDocument();
    expect(screen.getByText('NoMetadata.doc')).toBeInTheDocument();

    expect(screen.getByText('📅 2023')).toBeInTheDocument();
    expect(screen.getByText('📄 PDF')).toBeInTheDocument();
    expect(screen.getByText('📄 Report')).toBeInTheDocument();
    expect(screen.getByText('📅 1/15/2023')).toBeInTheDocument();
    expect(screen.getByText('📄 MP3')).toBeInTheDocument();
    expect(screen.getByText('📄 Recording')).toBeInTheDocument();

    const snippetsContainer = screen.getByTestId('snippets-container');
    expect(within(snippetsContainer).getByTestId('snippet-text-0')).toHaveTextContent('Sample text one');
    expect(screen.getByText('80% match')).toBeInTheDocument();
    expect(within(snippetsContainer).getByTestId('snippet-text-1')).toHaveTextContent('Sample text two');
    expect(screen.getByText('70% match')).toBeInTheDocument();
    expect(within(snippetsContainer).getByTestId('snippet-text-2')).toHaveTextContent('Sample audio snippet');
    expect(screen.getByText('60% match')).toBeInTheDocument();
    expect(within(snippetsContainer).getByTestId('snippet-text-3')).toHaveTextContent('No metadata snippet');
    expect(screen.getByText('90% match')).toBeInTheDocument();

    const viewLinks = screen.getAllByRole('link', { name: 'View Document' });
    expect(viewLinks[0].href).toBe('http://example.com/doc1.pdf');
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(3);
  });

  test('displays no results message when results are empty', () => {
    render(<SearchResults results={[]} query={mockQuery} />);
    expect(screen.getByText('No results match your filter criteria.')).toBeInTheDocument();
  });

  test('filters results by file type', async () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Audio1.mp3')).toBeInTheDocument();
    expect(screen.getByText('NoMetadata.doc')).toBeInTheDocument();

    const fileTypeSelect = screen.getByRole('combobox', { name: /filter by file type/i });
    await act(async () => {
      fireEvent.change(fileTypeSelect, { target: { value: 'PDF' } });
    });

    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Audio1.mp3')).not.toBeInTheDocument();
    expect(screen.queryByText('NoMetadata.doc')).not.toBeInTheDocument();
  });

  test('filters results by year range', async () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Audio1.mp3')).toBeInTheDocument();
    expect(screen.getByText('NoMetadata.doc')).toBeInTheDocument();

    const minYearSelect = screen.getAllByRole('combobox')[0];
    const maxYearSelect = screen.getAllByRole('combobox')[1];
    await act(async () => {
      fireEvent.change(minYearSelect, { target: { value: '2023' } });
      fireEvent.change(maxYearSelect, { target: { value: '2023' } });
    });

    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Audio1.mp3')).not.toBeInTheDocument();
    expect(screen.queryByText('NoMetadata.doc')).not.toBeInTheDocument();
  });

  test('handles invalid year range gracefully', async () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    const minYearSelect = screen.getAllByRole('combobox')[0];
    const maxYearSelect = screen.getAllByRole('combobox')[1];
    await act(async () => {
      fireEvent.change(minYearSelect, { target: { value: '2024' } });
      fireEvent.change(maxYearSelect, { target: { value: '2023' } });
    });

    expect(screen.getByText('No results match your filter criteria.')).toBeInTheDocument();
  });

  test('toggles group by file type', async () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    expect(screen.queryByRole('heading', { name: 'PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'MP3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'UNKNOWN' })).not.toBeInTheDocument();

    const groupButton = screen.getByRole('button', { name: /group by file type/i });
    await act(async () => {
      fireEvent.click(groupButton);
    });

    expect(screen.getByRole('heading', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'MP3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'UNKNOWN' })).toBeInTheDocument();
    expect(screen.getByText('Document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Audio1.mp3')).toBeInTheDocument();
    expect(screen.getByText('NoMetadata.doc')).toBeInTheDocument();

    const ungroupButton = screen.getByRole('button', { name: /ungroup/i });
    await act(async () => {
      fireEvent.click(ungroupButton);
    });

    expect(screen.queryByRole('heading', { name: 'PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'MP3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'UNKNOWN' })).not.toBeInTheDocument();
  });

  test('populates year and file type dropdowns correctly', () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    const [minYearSelect, maxYearSelect] = screen.getAllByRole('combobox').slice(0, 2);
    expect(minYearSelect).toHaveTextContent('From year');
    expect(minYearSelect).toHaveTextContent('2023');
    expect(minYearSelect).toHaveTextContent('2024');
    expect(maxYearSelect).toHaveTextContent('To year');
    expect(maxYearSelect).toHaveTextContent('2023');
    expect(maxYearSelect).toHaveTextContent('2024');

    const fileTypeSelect = screen.getByRole('combobox', { name: /filter by file type/i });
    expect(fileTypeSelect).toHaveTextContent('All File Types');
    expect(fileTypeSelect).toHaveTextContent('PDF');
    expect(fileTypeSelect).toHaveTextContent('MP3');
  });

  test('downloads results with correct content', async () => {
    const blobSpy = jest.spyOn(global, 'Blob').mockImplementation((content) => ({ content }));
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
    });

    render(<SearchResults results={mockResults} query={mockQuery} />);

    const downloadButton = screen.getAllByRole('button', { name: 'Download' })[0];
    await act(async () => {
      fireEvent.click(downloadButton);
    });

    expect(blobSpy).toHaveBeenCalledWith(
      [
        `FROM: Document1.pdf \n\n• "Sample text one"\n  Match: 80%\n\n• "Sample text two"\n  Match: 70%\n\n`,
      ],
      { type: 'text/plain' }
    );

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement().download).toBe('Document1_results.txt');
    expect(document.createElement().click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob://test');

    blobSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  test('handles download for file without extension', async () => {
    const noExtResult = [
      {
        title: 'NoExtension',
        url: 'http://example.com/noext',
        snippets: [{ text: 'No extension snippet', score: 0.5 }],
        metadata: { year: '2023', file_type: 'TXT' },
      },
    ];
    const blobSpy = jest.spyOn(global, 'Blob').mockImplementation((content) => ({ content }));
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: jest.fn(),
    });

    render(<SearchResults results={noExtResult} query={mockQuery} />);

    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await act(async () => {
      fireEvent.click(downloadButton);
    });

    expect(document.createElement().download).toBe('NoExtension_results.txt');

    blobSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  test('handles missing snippets gracefully', () => {
    const noSnippetsResult = [
      {
        title: 'NoSnippets.pdf',
        url: 'http://example.com/nosnippets.pdf',
        snippets: [],
        metadata: { year: '2023', file_type: 'PDF' },
      },
    ];
    render(<SearchResults results={noSnippetsResult} query={mockQuery} />);

    expect(screen.getByText('NoSnippets.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Document' })).toBeInTheDocument();
    expect(screen.getByText('📅 2023')).toBeInTheDocument();
    expect(screen.getByText('📄 PDF')).toBeInTheDocument();
  });

  test('handles missing metadata fields', () => {
    const minimalResult = [
      {
        title: 'Minimal.pdf',
        url: 'http://example.com/minimal.pdf',
        snippets: [{ text: 'Minimal snippet', score: 0.2 }],
      },
    ];
    render(<SearchResults results={minimalResult} query={mockQuery} />);

    expect(screen.getByText('Minimal.pdf')).toBeInTheDocument();
    const snippetsContainer = screen.getByTestId('snippets-container');
    expect(within(snippetsContainer).getByTestId('snippet-text-0')).toHaveTextContent('Minimal snippet');
    expect(screen.getByText('80% match')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Document' }).href).toBe('http://example.com/minimal.pdf');
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  test('handles undefined props', () => {
    render(<SearchResults />);
    expect(screen.getByText('No results match your filter criteria.')).toBeInTheDocument();
  });

  test('handles malformed snippets', () => {
    const malformedResult = [
      {
        title: 'Malformed.pdf',
        url: 'http://example.com/malformed.pdf',
        snippets: [{ text: '', score: null }],
        metadata: { year: '2023', file_type: 'PDF' },
      },
    ];
    render(<SearchResults results={malformedResult} query={mockQuery} />);

    expect(screen.getByText('Malformed.pdf')).toBeInTheDocument();
    expect(screen.getByText('100% match')).toBeInTheDocument();
  });

  test('handles missing title and url', () => {
    const noTitleResult = [
      {
        snippets: [{ text: 'No title snippet', score: 0.2 }],
        metadata: { year: '2023', file_type: 'PDF' },
      },
    ];
    render(<SearchResults results={noTitleResult} query={mockQuery} />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Document' }).href).toBe('#');
  });
});