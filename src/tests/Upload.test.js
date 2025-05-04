import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Upload from '../components/FileManager/Upload';
import { supabase } from '../contexts/client';

// Mock Supabase client
jest.mock('../contexts/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Upload Component', () => {
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockOnUploadSuccess = jest.fn();
  const mockUseAuth = require('../contexts/AuthContext').useAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Reset timers to avoid interference
    mockUseAuth.mockReturnValue({ user: mockUser });
    // Reset Supabase mocks
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: '123/folder1/123-timestamp.pdf' }, error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'doc1' }], error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));
    // Mock fetch for process-document API
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('Success'),
    });
    // Unmount previous renders to clear state
    render(<div />).unmount();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload form with file input and metadata fields', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Document Category *')).toBeInTheDocument();
      expect(screen.getByLabelText('Document Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Year')).toBeInTheDocument();
      expect(screen.getByLabelText('Author')).toBeInTheDocument();
      expect(screen.getByText('Select File')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('disables form when disabled prop is true', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} disabled />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Select File/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeDisabled();
    }, { timeout: 3000 });
  });

  test('updates file preview on file selection', async () => {
    const user = userEvent.setup();
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.00 MB')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });
  });

  test('displays error for duplicate file name on selection', async () => {
    const user = userEvent.setup();
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ name: 'test.pdf' }], error: null }),
      }),
    }));

    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);

    await act(async () => {
      await user.upload(fileInput, file);
    });

    await waitFor(() => {
      expect(screen.getByText(/"test.pdf" already exists in the system/)).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });

    const categorySelect = screen.getByLabelText('Document Category *');
    const documentTypeSelect = screen.getByLabelText('Document Type *');

    await act(async () => {
      await user.selectOptions(categorySelect, 'constitutional');
      await user.selectOptions(documentTypeSelect, 'constitution_1996');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Upload Document/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/A file named "test.pdf" already exists/)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('updates document type options based on category selection', async () => {
    const user = userEvent.setup();
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      await user.selectOptions(categorySelect, 'constitutional');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Constitution of South Africa (1996)')).toBeInTheDocument();
      const documentTypeSelect = screen.getByLabelText('Document Type *');
      expect(documentTypeSelect).toHaveTextContent('Constitution of South Africa (1996)');
      expect(documentTypeSelect).toHaveTextContent('Bill of Rights');
    }, { timeout: 3000 });
    
    await act(async () => {
      await user.selectOptions(categorySelect, 'judicial');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Constitutional Court Ruling')).toBeInTheDocument();
      const documentTypeSelect = screen.getByLabelText('Document Type *');
      expect(documentTypeSelect).toHaveTextContent('Constitutional Court Ruling');
      expect(documentTypeSelect).not.toHaveTextContent('Bill of Rights');
    }, { timeout: 3000 });
  });

  test('displays error when document type is not selected', async () => {
    const user = userEvent.setup();
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      await user.selectOptions(categorySelect, 'constitutional');
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
    }, { timeout: 3000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Please specify the document type/)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('displays error when file size exceeds 50MB', async () => {
    const user = userEvent.setup();
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 }); // 51MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      await user.selectOptions(categorySelect, 'constitutional');
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      await user.selectOptions(documentTypeSelect, 'constitution_1996');
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 3000 });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('handles Supabase storage upload error', async () => {
    const user = userEvent.setup();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockRejectedValue(new Error('Storage upload failed')),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      await user.selectOptions(categorySelect, 'constitutional');
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      await user.selectOptions(documentTypeSelect, 'constitution_1996');
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 3000 });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Storage upload failed')).toBeInTheDocument();
      expect(supabase.storage.from().remove).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    }, { timeout: 3000 });
    
    console.error.mockRestore();
  });
});