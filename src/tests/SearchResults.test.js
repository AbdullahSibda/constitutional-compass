import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchResults from '../components/SearchResults/SearchResults';
import { highlightText } from '../components/utils/highlightText';

// Mock dependencies
jest.mock('../components/utils/highlightText', () => ({
  highlightText: jest.fn((text) => <span data-testid="highlighted-text">{text}</span>),
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

  test('populates file type dropdown correctly', () => {
    render(<SearchResults results={mockResults} query={mockQuery} />);

    const fileTypeSelect = screen.getByRole('combobox', { name: /filter by file type/i });
    expect(fileTypeSelect).toHaveValue('all');
    const options = within(fileTypeSelect).getAllByRole('option');
    expect(options.map(opt => opt.textContent)).toEqual(['All File Types', 'PDF', 'MP3']);
  });
});