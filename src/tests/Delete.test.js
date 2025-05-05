import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Delete, { deleteItem, restoreItem } from '../components/FileManager/Delete';
import { supabase } from '../contexts/client';

// Mock Supabase client
jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Delete Component', () => {
  const mockItem = { id: 'doc1', name: 'test.pdf' };
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing (null)', () => {
    render(<Delete item={mockItem} onSuccess={mockOnSuccess} onError={mockOnError} />);
    expect(screen.queryByRole(/.*/)).toBeNull(); // No elements should be rendered
  });

  test('does not call onSuccess or onError during render', () => {
    render(<Delete item={mockItem} onSuccess={mockOnSuccess} onError={mockOnError} />);
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });
});

describe('deleteItem Function', () => {
  const mockItem = { id: 'doc1' };
  const mockSupabaseChain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from.mockReturnValue(mockSupabaseChain);
  });

  test('successfully marks item as deleted and returns true', async () => {
    const result = await deleteItem(mockItem);
    expect(result).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_deleted: true });
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'doc1');
  });

  test('throws error when Supabase update fails', async () => {
    mockSupabaseChain.eq.mockResolvedValue({ error: new Error('Database error') });

    await expect(deleteItem(mockItem)).rejects.toThrow('Failed to delete item: Database error');
    expect(supabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_deleted: true });
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'doc1');
  });
});

describe('restoreItem Function', () => {
  const mockItem = { id: 'doc1' };
  const mockSupabaseChain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from.mockReturnValue(mockSupabaseChain);
  });

  test('successfully restores item and returns true', async () => {
    const result = await restoreItem(mockItem);
    expect(result).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_deleted: false });
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'doc1');
  });

  test('throws error when Supabase restore fails', async () => {
    mockSupabaseChain.eq.mockResolvedValue({ error: new Error('Database error') });

    await expect(restoreItem(mockItem)).rejects.toThrow('Failed to restore item: Database error');
    expect(supabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_deleted: false });
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'doc1');
  });
});