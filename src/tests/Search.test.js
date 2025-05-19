import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Search from '../components/FileManager/Search';
import { supabase } from '../contexts/client';

jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockOnSearchResults = jest.fn();
const mockOnSearchError = jest.fn();
const mockOnClearSearch = jest.fn();
const mockCurrentFolder = 'folder1';
const rootFolderId = '00000000-0000-0000-0000-000000000000';

const mockDocuments = [
  {
    id: 'doc1',
    is_folder: false,
    parent_id: 'folder1',
    metadata: { displayName: 'Test Doc', file_type: 'PDF', type: 'Document', year: '2023' },
    parentFolder: { id: 'folder1', name: 'Folder 1' },
  },
  {
    id: 'doc2',
    is_folder: false,
    parent_id: 'subfolder1',
    metadata: { displayName: 'Another Doc', file_type: 'DOCX', type: 'Report', year: '2024' },
    parentFolder: { id: 'subfolder1', name: 'Subfolder 1' },
  },
];

const mockFolders = [
  { id: 'subfolder1', is_folder: true, parent_id: 'folder1' },
  { id: 'subfolder2', is_folder: true, parent_id: 'folder1' },
];

const mockQueryChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
};

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockImplementation((table) => {
    if (table !== 'documents') return mockQueryChain;
    return {
      select: jest.fn().mockImplementation((query) => {
        const chain = { ...mockQueryChain };
        if (query === '*, parentFolder:parent_id (id, name)') {
          chain.in = jest.fn().mockResolvedValue({ data: mockDocuments, error: null });
        } else if (query === 'id') {
          chain.eq = jest.fn().mockReturnThis();
          chain.neq = jest.fn().mockReturnThis();
          chain.in = jest.fn().mockImplementation((field, values) => {
            if (field === 'parent_id') {
              return Promise.resolve({
                data: mockFolders.filter((f) => values.includes(f.parent_id)),
                error: null,
              });
            }
            return Promise.resolve({ data: [], error: null });
          });
        }
        return chain;
      }),
    };
  });
});

function renderComponent(currentFolder = mockCurrentFolder) {
  render(
    <Search
      currentFolder={currentFolder}
      onSearchResults={mockOnSearchResults}
      onSearchError={mockOnSearchError}
      onClearSearch={mockOnClearSearch}
    />
  );
}

describe('Search Component', () => {
  test('renders input and buttons', () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/search files/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  test('updates input value', async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/search files/i);
    await user.type(input, 'constitution');

    expect(input).toHaveValue('constitution');
  });

  test('calls onClearSearch when query is empty and search is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
  });

  test('handles search error', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockRejectedValue(new Error('Search failed')),
    }));

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByPlaceholderText(/search files/i), 'error');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockOnSearchError).toHaveBeenCalledWith(expect.stringContaining('Search failed'));
      expect(mockOnSearchResults).not.toHaveBeenCalled();
    });
  });

  test('clears search when Clear button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/search files/i);
    await user.type(input, 'something');

    expect(input).toHaveValue('something');

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(input).toHaveValue('');
    expect(mockOnClearSearch).toHaveBeenCalled();
  });
 
  test('handles search with whitespace-only query', async () => {
    const user = userEvent.setup();
    renderComponent();

    const input = screen.getByPlaceholderText(/search files/i);
    await user.type(input, '   ');

    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
      expect(supabase.from).not.toHaveBeenCalled();
      expect(mockOnSearchResults).not.toHaveBeenCalled();
    });
  });

});