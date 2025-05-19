import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ContextMenu from '../components/FileManager/ContextMenu';
import * as DeleteModule from '../components/FileManager/Delete';

// Mock the Delete module
jest.mock('../components/FileManager/Delete', () => ({
  deleteItem: jest.fn(),
  restoreItem: jest.fn(),
}));

describe('ContextMenu Component', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnUndoDelete = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnMove = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnViewFile = jest.fn();

  const fileItem = {
    id: 'file1',
    name: 'Test File',
    is_folder: false,
  };

  const folderItem = {
    id: 'folder1',
    name: 'Test Folder',
    is_folder: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks for successful delete and restore
    DeleteModule.deleteItem.mockResolvedValue({ data: null, error: null });
    DeleteModule.restoreItem.mockResolvedValue({ data: null, error: null });
    // Spy on console.error to test error logging
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('renders context menu for a file with all options', async () => {
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    expect(screen.getByRole('menu', { name: /Item actions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View File/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toHaveClass('delete');
  });

  test('renders context menu for a folder without download or view file options', async () => {
    render(
      <ContextMenu
        item={folderItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    expect(screen.getByRole('menu', { name: /Item actions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Metadata/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View File/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toHaveClass('delete');
  });

  test('renders Undo Delete button when item is deleted', async () => {
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={true}
        onViewFile={mockOnViewFile}
      />
    );

    expect(screen.getByRole('button', { name: /Undo Delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Undo Delete/i })).toHaveClass('delete');
  });

  test('calls onEdit and onClose when Edit Metadata is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Edit Metadata/i }));

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onDownload and onClose when Download is clicked for a file', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Download/i }));

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onViewFile and onClose when View File is clicked for a file', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /View File/i }));

    expect(mockOnViewFile).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onMove and onClose when Move is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Move/i }));

    expect(mockOnMove).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls deleteItem, onDelete, and onClose when Delete is clicked for a file', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    await waitFor(() => {
      expect(DeleteModule.deleteItem).toHaveBeenCalledWith(fileItem);
      expect(mockOnDelete).toHaveBeenCalledWith(fileItem.id, true);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('handles deleteItem error and calls onDelete with error message', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to delete item';
    DeleteModule.deleteItem.mockRejectedValue(new Error(errorMessage));

    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    await waitFor(() => {
      expect(DeleteModule.deleteItem).toHaveBeenCalledWith(fileItem);
      expect(console.error).toHaveBeenCalledWith('Delete failed:', expect.any(Error));
      expect(mockOnDelete).toHaveBeenCalledWith(errorMessage);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('calls restoreItem, onUndoDelete, and onClose when Undo Delete is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={true}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Undo Delete/i }));

    await waitFor(() => {
      expect(DeleteModule.restoreItem).toHaveBeenCalledWith(fileItem);
      expect(mockOnUndoDelete).toHaveBeenCalledWith(fileItem.id, false);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('handles restoreItem error and calls onUndoDelete with error message', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to restore item';
    DeleteModule.restoreItem.mockRejectedValue(new Error(errorMessage));

    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={true}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('button', { name: /Undo Delete/i }));

    await waitFor(() => {
      expect(DeleteModule.restoreItem).toHaveBeenCalledWith(fileItem);
      expect(console.error).toHaveBeenCalledWith('Undo delete failed:', expect.any(Error));
      expect(mockOnUndoDelete).toHaveBeenCalledWith(errorMessage);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onClose when clicking outside the menu', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    await user.click(screen.getByRole('dialog'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).not.toHaveBeenCalled();
    expect(mockOnDownload).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(mockOnUndoDelete).not.toHaveBeenCalled();
    expect(mockOnViewFile).not.toHaveBeenCalled();
  });

  test('stops event propagation when clicking inside the menu', async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    const menu = screen.getByRole('menu', { name: /Item actions/i });
    const stopPropagation = jest.fn();
    await user.click(menu, { stopPropagation });

    expect(stopPropagation).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('menu has correct aria-label for accessibility', async () => {
    render(
      <ContextMenu
        item={fileItem}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndoDelete={mockOnUndoDelete}
        onDownload={mockOnDownload}
        onMove={mockOnMove}
        onClose={mockOnClose}
        isDeleted={false}
        onViewFile={mockOnViewFile}
      />
    );

    expect(screen.getByRole('menu')).toHaveAttribute('aria-label', 'Item actions');
  });
});