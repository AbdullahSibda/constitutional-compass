import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Filter from '../components/FileManager/Filter';
import { supabase } from '../contexts/client';

// Mock Supabase client
jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Custom matcher to normalize whitespace for query string comparison
const normalizeQueryString = (str) => str.replace(/\s+/g, ' ').trim();

describe('Filter Component', () => {
  const mockOnFilterResults = jest.fn();
  const mockOnFilterError = jest.fn();
  const mockOnFilterActive = jest.fn();
  const mockCurrentFolder = 'folder1';
  const mockDocuments = [
    {
      id: 'doc1',
      is_folder: false,
      parent_id: 'folder1',
      metadata: { file_type: 'PDF', displayName: 'Test Doc' },
      parentFolder: { name: 'Folder 1' },
    },
  ];
  const mockQueryChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockResolvedValue({ data: mockDocuments, error: null }),
  };
  const mockRenderFilterInput = jest.fn(({ filterCriteria, setFilterCriteria, filterValue, setFilterValue, handleApplyFilter, handleClearFilter }) => (
    <div>
      <select data-testid="criteria" value={filterCriteria} onChange={(e) => setFilterCriteria(e.target.value)}>
        <option value="">Select Criteria</option>
        <option value="file_type">File Type</option>
        <option value="displayName">Display Name</option>
      </select>
      <input
        data-testid="value"
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
      />
      <button data-testid="apply" onClick={handleApplyFilter}>Apply</button>
      <button data-testid="clear" onClick={handleClearFilter}>Clear</button>
    </div>
  ));

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from.mockReturnValue(mockQueryChain);
  });

  test('renders filter input via renderFilterInput prop', () => {
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    expect(mockRenderFilterInput).toHaveBeenCalledWith({
      filterCriteria: '',
      setFilterCriteria: expect.any(Function),
      filterValue: '',
      setFilterValue: expect.any(Function),
      handleApplyFilter: expect.any(Function),
      handleClearFilter: expect.any(Function),
    });
    expect(screen.getByTestId('criteria')).toBeInTheDocument();
    expect(screen.getByTestId('value')).toBeInTheDocument();
    expect(screen.getByTestId('apply')).toBeInTheDocument();
    expect(screen.getByTestId('clear')).toBeInTheDocument();
  });

  test('updates filterCriteria and filterValue state', async () => {
    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const valueInput = screen.getByTestId('value');

    await user.selectOptions(criteriaSelect, 'file_type');
    expect(criteriaSelect).toHaveValue('file_type');

    await user.type(valueInput, 'PDF');
    expect(valueInput).toHaveValue('PDF');
  });

  test('applies filter with file_type criteria and calls onFilterResults', async () => {
    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const valueInput = screen.getByTestId('value');
    const applyButton = screen.getByTestId('apply');

    await user.selectOptions(criteriaSelect, 'file_type');
    await user.type(valueInput, 'PDF');
    await user.click(applyButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('documents');
      expect(normalizeQueryString(mockQueryChain.select.mock.calls[0][0])).toBe(
        normalizeQueryString(`
          *,
          parentFolder:documents!parent_id(name)
        `)
      );
      // Corrected order of assertions
      expect(mockQueryChain.eq).toHaveBeenCalledWith('is_folder', false);
      expect(mockQueryChain.eq).toHaveBeenCalledWith('parent_id', 'folder1');
      expect(mockQueryChain.ilike).toHaveBeenCalledWith('metadata->>file_type', '%PDF%');
      expect(mockOnFilterActive).toHaveBeenCalledWith(true);
      expect(mockOnFilterResults).toHaveBeenCalledWith([
        {
          ...mockDocuments[0],
          parentFolder: { name: 'Folder 1' },
        },
      ]);
      expect(mockOnFilterError).not.toHaveBeenCalled();
    });
  });

  test('handles Supabase query error', async () => {
    // Mock an error response from Supabase
    const mockError = new Error('Query failed');
    mockQueryChain.ilike.mockResolvedValueOnce({ data: null, error: mockError });

    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const valueInput = screen.getByTestId('value');
    const applyButton = screen.getByTestId('apply');

    await user.selectOptions(criteriaSelect, 'file_type');
    await user.type(valueInput, 'PDF');
    await user.click(applyButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('documents');
       expect(normalizeQueryString(mockQueryChain.select.mock.calls[0][0])).toBe(
        normalizeQueryString(`
          *,
          parentFolder:documents!parent_id(name)
        `)
      );
      // Corrected order of assertions
      expect(mockQueryChain.eq).toHaveBeenCalledWith('is_folder', false);
      expect(mockQueryChain.eq).toHaveBeenCalledWith('parent_id', 'folder1');
      expect(mockQueryChain.ilike).toHaveBeenCalledWith('metadata->>file_type', '%PDF%');
      expect(mockOnFilterActive).toHaveBeenCalledWith(true);
      expect(mockOnFilterError).toHaveBeenCalledWith('Filter failed: Query failed');
      expect(mockOnFilterResults).not.toHaveBeenCalled();
    });
  });

  test('handles malformed query error', async () => {
    // Simulate an error by selecting an invalid criteria that would cause a malformed query in the real component
    // In this mock, we'll just mock the eq to return an error directly for the metadata query
     const mockError = new Error('Invalid JSON path');
    mockQueryChain.eq.mockImplementation((key, value) => {
        // Original eq calls
        if (key === 'is_folder' || key === 'parent_id') {
            return mockQueryChain;
        }
        // Mocked error for the metadata query
        if (key.startsWith('metadata->>')) {
             return { data: null, error: mockError };
        }
        return mockQueryChain; // Should not reach here in these tests
    });
    // Ensure ilike still works for the file_type test
     mockQueryChain.ilike.mockResolvedValueOnce({ data: mockDocuments, error: null });


    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const valueInput = screen.getByTestId('value');
    const applyButton = screen.getByTestId('apply');

    await user.selectOptions(criteriaSelect, 'displayName'); // Use displayName which is handled by .eq
    await user.type(valueInput, 'Test Doc');
    await user.click(applyButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('documents');
       expect(normalizeQueryString(mockQueryChain.select.mock.calls[0][0])).toBe(
        normalizeQueryString(`
          *,
          parentFolder:documents!parent_id(name)
        `)
      );
      // Corrected order of assertions
      expect(mockQueryChain.eq).toHaveBeenCalledWith('is_folder', false);
      expect(mockQueryChain.eq).toHaveBeenCalledWith('parent_id', 'folder1');
       expect(mockQueryChain.eq).toHaveBeenCalledWith('metadata->>displayName', 'Test Doc');
      expect(mockOnFilterActive).toHaveBeenCalledWith(true);
      expect(mockOnFilterError).toHaveBeenCalledWith('Filter failed: Invalid JSON path');
      expect(mockOnFilterResults).not.toHaveBeenCalled();
    });
  });

  test('calls handleClearFilter when filterCriteria is empty', async () => {
    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const valueInput = screen.getByTestId('value');
    const applyButton = screen.getByTestId('apply');

    // Do not select criteria, only type value
    await user.type(valueInput, 'Test Value');
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockOnFilterActive).toHaveBeenCalledWith(false);
      expect(mockOnFilterResults).not.toHaveBeenCalled();
      expect(mockOnFilterError).not.toHaveBeenCalled();
      expect(screen.getByTestId('criteria')).toHaveValue('');
      expect(screen.getByTestId('value')).toHaveValue('');
    }, { timeout: 1000 }); // Increased timeout for clarity
  });

  test('calls handleClearFilter when filterValue is empty', async () => {
    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const applyButton = screen.getByTestId('apply');

    // Select criteria, but do not type value
    await user.selectOptions(criteriaSelect, 'file_type');
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockOnFilterActive).toHaveBeenCalledWith(false);
      expect(mockOnFilterResults).not.toHaveBeenCalled();
      expect(mockOnFilterError).not.toHaveBeenCalled();
      expect(screen.getByTestId('criteria')).toHaveValue('');
      expect(screen.getByTestId('value')).toHaveValue('');
    }, { timeout: 1000 });
  });

  test('clears filter and resets state via handleClearFilter', async () => {
    const user = userEvent.setup();
    render(
      <Filter
        currentFolder={mockCurrentFolder}
        onFilterResults={mockOnFilterResults}
        onFilterError={mockOnFilterError}
        onFilterActive={mockOnFilterActive}
        renderFilterInput={mockRenderFilterInput}
      />
    );

    const criteriaSelect = screen.getByTestId('criteria');
    const valueInput = screen.getByTestId('value');
    const clearButton = screen.getByTestId('clear');

    await user.selectOptions(criteriaSelect, 'file_type');
    await user.type(valueInput, 'PDF');
    await user.click(clearButton);

    await waitFor(() => {
      expect(mockOnFilterActive).toHaveBeenCalledWith(false);
      expect(screen.getByTestId('criteria')).toHaveValue('');
      expect(screen.getByTestId('value')).toHaveValue('');
    });
  });
});