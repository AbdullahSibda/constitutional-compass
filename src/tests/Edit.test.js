import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Edit from '../components/FileManager/Edit';
import { supabase } from '../contexts/client';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('Edit Component', () => {
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockOnEditSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  const folderItem = {
    id: 'folder1',
    name: 'Test Folder',
    is_folder: true,
    parent_id: 'parent1',
  };

  const documentItem = {
    id: 'doc1',
    name: 'Test Document.pdf',
    is_folder: false,
    parent_id: 'parent1',
    metadata: {
      displayName: 'Test Document',
      type: 'constitution_1996',
      year: '1996',
      author: 'Constitutional Assembly',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });

    // Mock Supabase select for fetchExistingNames
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders folder edit form correctly', async () => {
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Folder/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Folder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  test('renders document edit form correctly', async () => {
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Metadata/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Document Category/i })).toHaveValue('constitutional');
      expect(screen.getByRole('combobox', { name: /Document Type/i })).toHaveValue('constitution_1996');
      expect(screen.getByDisplayValue('1996')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Constitutional Assembly')).toBeInTheDocument();
    });
  });

  test('displays validation error for empty folder name', async () => {
    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Folder Name *');

    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Folder name is required', { selector: '#folderName-error' })).toBeInTheDocument();
      expect(supabase.from().update).not.toHaveBeenCalled();
    });
  });

  test('displays validation error for empty document display name', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    });

    const displayNameInput = screen.getByLabelText('Display Name *');

    await user.clear(displayNameInput);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Display name is required', { selector: '#displayName-error' })).toBeInTheDocument();
      expect(supabase.from().update).not.toHaveBeenCalled();
    });
  });

  test('displays validation error for missing document type', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Document Type *')).toBeInTheDocument();
    });

    const documentTypeSelect = screen.getByLabelText('Document Type *');

    await user.selectOptions(documentTypeSelect, '');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Document type is required', { selector: '#documentType-error' })).toBeInTheDocument();
      expect(supabase.from().update).not.toHaveBeenCalled();
    });
  });

  test('displays validation error for duplicate folder name', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({
            data: [{ name: 'Existing Folder', is_folder: true }],
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Folder Name *');

    await user.clear(nameInput);
    await user.type(nameInput, 'Existing Folder');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('A folder with this name already exists', { selector: '#folderName-error' })).toBeInTheDocument();
      expect(supabase.from().update).not.toHaveBeenCalled();
    });
  });

  test('handles Supabase update error for folder', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('Update failed')),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Folder Name *');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Folder');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
      expect(mockOnEditSuccess).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('handles Supabase update error for document', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('Update failed')),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    });

    const displayNameInput = screen.getByLabelText('Display Name *');

    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Document');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
      expect(mockOnEditSuccess).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('updates document type options based on category selection', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Document Category *')).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText('Document Category *');

    await user.selectOptions(categorySelect, 'judicial');

    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await waitFor(() => {
      expect(documentTypeSelect).toHaveTextContent('Constitutional Court Ruling');
      expect(documentTypeSelect).toHaveTextContent('Supreme Court of Appeal Decision');
      expect(documentTypeSelect).not.toHaveTextContent('Constitution of South Africa (1996)');
    });
  });

  test('triggers onCancel when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('disables form fields and buttons during loading', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Folder Name *');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Folder');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(nameInput).toBeDisabled();
      expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });
  });

  test('successfully updates folder and triggers onEditSuccess', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Folder Name *')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Folder Name *');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Folder');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('✓ Folder updated successfully!')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockOnEditSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('successfully updates document and triggers onEditSuccess', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    });

    const displayNameInput = screen.getByLabelText('Display Name *');

    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Document');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('✓ Metadata updated successfully!')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockOnEditSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});