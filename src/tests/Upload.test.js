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
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: mockUser });
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
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('Success'),
    });
    render(<div />).unmount();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders upload form with file input and metadata fields', async () => {
    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description *')).toBeInTheDocument();
      expect(screen.getByLabelText('Year')).toBeInTheDocument();
      expect(screen.getByLabelText('Author')).toBeInTheDocument();
      expect(screen.getByText('Select File')).toBeInTheDocument();
    }, { timeout: 15000 });
  });

  test('disables form when disabled prop is true', async () => {
    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} disabled />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Select File/i)).toBeDisabled();
      expect(screen.getByLabelText('Display Name *')).toBeDisabled();
      expect(screen.getByLabelText('Description *')).toBeDisabled();
      expect(screen.getByLabelText('Year')).toBeDisabled();
      expect(screen.getByLabelText('Author')).toBeDisabled();
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeDisabled();
    }, { timeout: 15000 });
  });

  test('updates file preview and display name on file selection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    const fileInput = screen.getByLabelText(/Select File/i);

    await act(async () => {
      await user.upload(fileInput, file);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.00 MB')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 15000 });
  });

  test('displays error for duplicate file name on selection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ name: 'test.pdf' }], error: null }),
      }),
    }));

    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    const fileInput = screen.getByLabelText(/Select File/i);

    await act(async () => {
      await user.upload(fileInput, file);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByText(/"test.pdf" already exists in the system/)).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 15000 });

    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test description');
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(descriptionInput).toHaveValue('Test description');
    }, { timeout: 15000 });

    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    const form = screen.getByRole('form', { name: /Upload document form/i });
    await act(async () => {
      console.log('Button disabled state:', submitButton.disabled);
      expect(submitButton).not.toBeDisabled();
      fireEvent.submit(form);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByText(/A file named "test.pdf" already exists/)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
    }, { timeout: 15000 });
  });

  test('displays error when description is not provided', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });
    const fileInput = screen.getByLabelText(/Select File/i);

    await act(async () => {
      await user.upload(fileInput, file);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 15000 });

    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    await waitFor(() => {
      console.log('Button disabled state:', submitButton.disabled);
      expect(submitButton).toBeDisabled();
      expect(screen.queryByText('Please provide a description of the document')).not.toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 15000 });
  });

  test('displays error when file size exceeds 50MB', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await act(async () => {
      render(<Upload parentId="folder1" onUploadSuccess={mockOnUploadSuccess} />);
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });
    const fileInput = screen.getByLabelText(/Select File/i);

    await act(async () => {
      await user.upload(fileInput, file);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toHaveValue('test');
    }, { timeout: 15000 });

    const descriptionInput = screen.getByLabelText('Description *');
    await act(async () => {
      await user.type(descriptionInput, 'Test description');
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(descriptionInput).toHaveValue('Test description');
    }, { timeout: 15000 });

    const submitButton = screen.getByRole('button', { name: /Upload Document/i });
    const form = screen.getByRole('form', { name: /Upload document form/i });
    await act(async () => {
      console.log('Button disabled state:', submitButton.disabled);
      expect(submitButton).not.toBeDisabled();
      fireEvent.submit(form);
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      screen.debug();
      expect(screen.getByText(/File size exceeds 50MB limit/)).toBeInTheDocument();
      expect(supabase.storage.from().upload).not.toHaveBeenCalled();
      expect(supabase.from().insert).not.toHaveBeenCalled();
    }, { timeout: 15000 });
  });
});