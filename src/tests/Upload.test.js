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
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({ user: mockUser });
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: '123/folder1/123-timestamp.pdf' }, error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'doc1' }, error: null }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('Success'),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload form with file input and metadata fields', async () => {
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description *')).toBeInTheDocument();
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
      expect(screen.getByLabelText('Display Name *')).toBeDisabled();
      expect(screen.getByLabelText('Description *')).toBeDisabled();
      expect(screen.getByLabelText('Year')).toBeDisabled();
      expect(screen.getByLabelText('Author')).toBeDisabled();
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

  test('displays error for duplicate file name on selection and upload', async () => {
    const user = userEvent.setup();
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'doc1' }, error: null }),
        }),
      }),
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

    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test document description');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Upload Document/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/A file named "test.pdf" already exists/)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('displays error when description is not provided', async () => {
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
    
    const form = screen.getByRole('form', { name: /Upload document/i });
    
    await act(async () => {
      fireEvent.submit(form);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Please provide a description of the document/)).toBeInTheDocument();
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
    
    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test document description');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/File size exceeds 50MB limit/i)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });
  
  test('handles file lookup error during upload', async () => {
    const user = userEvent.setup();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'doc1' }, error: null }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Lookup failed') }),
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
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 3000 });
    
    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test document description');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Couldn't verify file uniqueness/i)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    }, { timeout: 3000 });
    
    console.error.mockRestore();
  });

  test('displays error when no user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null });
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
    
    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test document description');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Missing required fields or form is disabled/i)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('handles Supabase storage upload error', async () => {
    jest.setTimeout(10000);
    const user = userEvent.setup();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    supabase.storage.from.mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: new Error('Storage upload failed') }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }));
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    const descriptionInput = screen.getByLabelText('Description *');
    
    await act(async () => {
      await user.type(descriptionInput, 'Test description');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      const errorArticle = screen.getByRole('alert');
      expect(errorArticle).toHaveTextContent(/Storage upload failed/i);
      expect(console.error).toHaveBeenCalledWith('handleUpload: catch error', expect.any(Error));
      expect(supabase.storage.from().remove).not.toHaveBeenCalled();
    }, { timeout: 5000 });
    
    console.error.mockRestore();
  });

  test('handles Azure function processing failure', async () => {
    jest.setTimeout(10000);
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('Processing error'),
    });
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    const descriptionInput = screen.getByLabelText('Description *');
    
    await act(async () => {
      await user.type(descriptionInput, 'Test description');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Processing failed: Processing error/i)).toBeInTheDocument();
      expect(mockOnUploadSuccess).not.toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  test('successfully uploads file and resets form', async () => {
    jest.setTimeout(10000);
    const user = userEvent.setup();
    
    render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    const fileInput = screen.getByLabelText(/Select File/i);
    
    await act(async () => {
      await user.upload(fileInput, file);
    });
    
    const descriptionInput = screen.getByLabelText('Description *');
    const displayNameInput = screen.getByLabelText('Display Name *');
    
    await act(async () => {
      await user.type(descriptionInput, 'Test description');
      await user.type(displayNameInput, 'Test Document');
    });
    
    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    
    await act(async () => {
      await user.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Document uploaded successfully/i)).toBeInTheDocument();
      expect(mockOnUploadSuccess).toHaveBeenCalled();
      expect(displayNameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });
});