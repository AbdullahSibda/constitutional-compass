import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileViewer from '../components/FileManager/FileViewer';
import { supabase } from '../contexts/client';

// Mock Supabase client
jest.mock('../contexts/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock browser APIs
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockOpen = jest.fn();
const mockAlert = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  global.window.open = mockOpen;
  global.alert = mockAlert;
});

describe('FileViewer Component', () => {
  const mockFile = { storage_path: 'documents/test.pdf' };
  const mockOnClose = jest.fn();
  const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
  const mockStorage = {
    download: jest.fn().mockResolvedValue({ data: mockBlob, error: null }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    supabase.storage.from.mockReturnValue(mockStorage);
    mockCreateObjectURL.mockReturnValue('blob://test-url');
    mockOpen.mockReturnValue({ closed: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.error.mockRestore();
  });

  test('renders nothing (null)', () => {
    render(<FileViewer file={mockFile} onClose={mockOnClose} />);
    expect(screen.queryByRole(/.*/)).toBeNull(); // No elements should be rendered
  });

  test('does not call onClose during initial render', () => {
    render(<FileViewer file={mockFile} onClose={mockOnClose} />);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('updates onCloseRef when onClose prop changes', () => {
    const { rerender } = render(<FileViewer file={mockFile} onClose={mockOnClose} />);
    const newOnClose = jest.fn();
    rerender(<FileViewer file={mockFile} onClose={newOnClose} />);
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(newOnClose).not.toHaveBeenCalled();
  });

  test('opens file in new window and calls onClose on success', async () => {
    jest.useFakeTimers();
    render(<FileViewer file={mockFile} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('documents');
      expect(mockStorage.download).toHaveBeenCalledWith('documents/test.pdf');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockOpen).toHaveBeenCalledWith('blob://test-url', '_blank');
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 2000 });

    jest.advanceTimersByTime(1000);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob://test-url');

    jest.useRealTimers();
  });

  test('does not re-open file if file prop remains the same', async () => {
    const { rerender } = render(<FileViewer file={mockFile} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(mockStorage.download).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    rerender(<FileViewer file={mockFile} onClose={mockOnClose} />);
    await waitFor(() => {
      expect(mockStorage.download).toHaveBeenCalledTimes(1); // Still only called once
    }, { timeout: 2000 });
  });

  test('does not run effect if file is null', async () => {
    render(<FileViewer file={null} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(supabase.storage.from).not.toHaveBeenCalled();
      expect(mockStorage.download).not.toHaveBeenCalled();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
      expect(mockOpen).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('handles Supabase download error', async () => {
    mockStorage.download.mockResolvedValue({ data: null, error: new Error('Download failed') });

    render(<FileViewer file={mockFile} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('documents');
      expect(mockStorage.download).toHaveBeenCalledWith('documents/test.pdf');
      expect(mockAlert).toHaveBeenCalledWith('Download failed');
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
      expect(mockOpen).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});