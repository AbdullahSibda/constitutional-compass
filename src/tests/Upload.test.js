import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

describe('Upload Component', () => {
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockOnUploadSuccess = jest.fn();
  const mockUseAuth = require('../contexts/AuthContext').useAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Reset timers to avoid interference
    mockUseAuth.mockReturnValue({ user: mockUser });
    // Reset Supabase mocks to default behavior
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: '123/folder1/123-timestamp.pdf' }, error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    }));
    // Unmount previous renders to clear state
    render(<div />).unmount();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload form with file input and metadata fields', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    await screen.findByRole('button', { name: /Upload Document/i });
    expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Category *')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Author')).toBeInTheDocument();
    expect(screen.getByText('Select File')).toBeInTheDocument();
  });

  test('disables form when disabled prop is true', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} disabled />);
    
    await screen.findByLabelText(/Select File/i);
    expect(screen.getByLabelText(/Select File/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Upload Document/i })).toBeDisabled();
  });

  test('updates file preview on file selection', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    await screen.findByText('test.pdf');
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
  });

  test('updates document type options based on category selection', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    await screen.findByText('Constitution of South Africa (1996)');
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    expect(documentTypeSelect).toHaveTextContent('Constitution of South Africa (1996)');
    expect(documentTypeSelect).toHaveTextContent('Bill of Rights');
    
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'judicial' } });
    });
    
    await screen.findByText('Constitutional Court Ruling');
    expect(documentTypeSelect).toHaveTextContent('Constitutional Court Ruling');
    expect(documentTypeSelect).not.toHaveTextContent('Bill of Rights');
  });

  test('displays error when document type is not selected', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await screen.findByText(/Please specify the document type/);
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('displays error when file size exceeds 50MB', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 }); // 51MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      fireEvent.change(documentTypeSelect, { target: { value: 'constitution_1996' } });
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 10000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await screen.findByText('File size exceeds 50MB limit');
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('handles Supabase storage upload error', async () => {
    jest.setTimeout(10000); // Increase test timeout
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockImplementation(() => {
        const error = new Error('Storage upload failed');
        error.statusCode = '400';
        throw error;
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      fireEvent.change(documentTypeSelect, { target: { value: 'constitution_1996' } });
    });
    
    const parentIdInput = screen.queryByLabelText(/Parent Folder/i); // Check for parentId input
    if (parentIdInput) {
      await act(async () => {
        fireEvent.change(parentIdInput, { target: { value: 'folder1' } });
      });
    }
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 10000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Storage upload failed')).toBeInTheDocument();
      expect(supabase.storage.from().remove).not.toHaveBeenCalled(); // No filePath, so no remove
      expect(supabase.from).not.toHaveBeenCalled();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    }, { timeout: 10000 });
    
    console.error.mockRestore(); // Restore console.error
  });

  test('displays and clears success message after timeout', async () => {
    jest.useFakeTimers();
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      fireEvent.change(documentTypeSelect, { target: { value: 'constitution_1996' } });
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 10000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await screen.findByText('✓ Document uploaded successfully!');
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('✓ Document uploaded successfully!')).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  test('displays and clears error message after timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockImplementation(() => {
        const error = new Error('Storage upload failed');
        error.statusCode = '400';
        throw error;
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      fireEvent.change(documentTypeSelect, { target: { value: 'constitution_1996' } });
    });
    
    const parentIdInput = screen.queryByLabelText(/Parent Folder/i); // Check for parentId input
    if (parentIdInput) {
      await act(async () => {
        fireEvent.change(parentIdInput, { target: { value: 'folder1' } });
      });
    }
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 10000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await screen.findByText('Storage upload failed');
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Storage upload failed')).not.toBeInTheDocument();
    });
    
    console.error.mockRestore(); // Restore console.error
    jest.useRealTimers();
  });

  test('updates progress during upload', async () => {
    let progressCallback;
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockImplementation((path, file, options) => {
        progressCallback = options.onProgress;
        return new Promise((resolve) => setTimeout(() => resolve({ data: { path }, error: null }), 100));
      }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const displayNameInput = screen.getByLabelText('Display Name *');
    await waitFor(() => {
      expect(displayNameInput).toHaveValue('test');
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.change(displayNameInput, { target: { value: 'test' } });
      fireEvent.blur(displayNameInput);
    });
    
    const categorySelect = screen.getByLabelText('Document Category *');
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'constitutional' } });
    });
    
    const documentTypeSelect = screen.getByLabelText('Document Type *');
    await act(async () => {
      fireEvent.change(documentTypeSelect, { target: { value: 'constitution_1996' } });
    });
    
    await waitFor(() => {
      expect(categorySelect).toHaveValue('constitutional');
      expect(documentTypeSelect).toHaveValue('constitution_1996');
    }, { timeout: 10000 });
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 10000 });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await screen.findByText('Uploading...');
    
    await act(async () => {
      progressCallback({ loaded: 50, total: 100 });
    });
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar', { name: /Upload progress/i });
      expect(progressBar).toHaveAttribute('value', '50');
      expect(screen.getByText('50%')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});