import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Edit from '../components/FileManager/Edit';
import { supabase } from '../contexts/client';

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
  const mockUseAuth = require('../contexts/AuthContext').useAuth;

  const folderItem = {
    id: 'folder1',
    name: 'Test Folder',
    is_folder: true,
  };

  const documentItem = {
    id: 'doc1',
    name: 'Test Document',
    is_folder: false,
    metadata: {
      displayName: 'Test Document',
      type: 'constitution_1996',
      year: '1996',
      author: 'Constitutional Assembly',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders folder edit form correctly', async () => {
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    expect(await screen.findByRole('heading', { name: /Edit Folder/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Folder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('renders document edit form correctly', async () => {
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    expect(await screen.findByRole('heading', { name: /Edit Metadata/i })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test Document')).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /Document Category/i, value: 'constitutional' })).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /Document Type/i, value: 'constitution_1996' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('1996')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Constitutional Assembly')).toBeInTheDocument();
  });

  test('displays validation error for empty folder name', async () => {
    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const nameInput = screen.getByDisplayValue('Test Folder');
    
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
  
    expect(await screen.findByText('Folder name is required', { selector: '#folderName-error' })).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });
  
  test('displays validation error for empty document display name', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const displayNameInput = screen.getByLabelText('Display Name *');
    
    await user.clear(displayNameInput);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
  
    expect(await screen.findByText('Display name is required', { selector: '#displayName-error' })).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });
  
  test('displays validation error for missing document type', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    
    await user.selectOptions(documentTypeSelect, '');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
  
    expect(await screen.findByText('Document type is required', { selector: '#documentType-error' })).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('handles Supabase update error for folder', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('Update failed')),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const nameInput = screen.getByDisplayValue('Test Folder');
    
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Folder');
    
    const form = await screen.findByRole('form');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
      expect(mockOnEditSuccess).not.toHaveBeenCalled();
    }, { timeout: 1000 });

    console.error.mockRestore(); // Restore console.error
  });

  test('handles Supabase update error for document', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockRejectedValue(new Error('Update failed')),
      }),
    });

    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const displayNameInput = screen.getByLabelText('Display Name *');
    
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Updated Document');
    
    const form = await screen.findByRole('form');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
      expect(mockOnEditSuccess).not.toHaveBeenCalled();
    }, { timeout: 1000 });

    console.error.mockRestore(); // Restore console.error
  });

  test('updates document type options based on category selection', async () => {
    const user = userEvent.setup();
    render(<Edit item={documentItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const categorySelect = screen.getByLabelText('Document Category *');
    
    await user.selectOptions(categorySelect, 'judicial');

    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await waitFor(() => {
      expect(documentTypeSelect).toHaveTextContent('Constitutional Court Ruling');
      expect(documentTypeSelect).not.toHaveTextContent('Constitution of South Africa (1996)');
    });
  });

  test('triggers onCancel when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    
    await user.keyboard('{Escape}');

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('disables form fields and buttons during loading', async () => {
    const user = userEvent.setup();
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
        ),
      }),
    });

    render(<Edit item={folderItem} onEditSuccess={mockOnEditSuccess} onCancel={mockOnCancel} />);
    const nameInput = screen.getByDisplayValue('Test Folder');
    
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Folder');
    
    const form = await screen.findByRole('form');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(nameInput).toBeDisabled();
      expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    }, { timeout: 1000 });
  });
});
