import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ContextMenu from '../components/FileManager/ContextMenu';

describe('ContextMenu Component', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnUndoDelete = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnMove = jest.fn();
  const mockOnClose = jest.fn();

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
      />
    );

    expect(screen.getByRole('list', { name: /Item actions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Metadata/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete File/i })).toBeInTheDocument();
  });

  test('renders context menu for a folder without download option', async () => {
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
      />
    );

    expect(screen.getByRole('list', { name: /Item actions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Metadata/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Folder/i })).toBeInTheDocument();
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
      />
    );

    expect(screen.getByRole('button', { name: /Undo Delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete File/i })).not.toBeInTheDocument();
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
      />
    );

    await user.click(screen.getByRole('button', { name: /Download/i }));

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
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
      />
    );

    await user.click(screen.getByRole('button', { name: /Move/i }));

    expect(mockOnMove).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onDelete and onClose when Delete File is clicked', async () => {
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
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete File/i }));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onDelete and onClose when Delete Folder is clicked', async () => {
    const user = userEvent.setup();
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
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete Folder/i }));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onUndoDelete and onClose when Undo Delete is clicked', async () => {
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
      />
    );

    await user.click(screen.getByRole('button', { name: /Undo Delete/i }));

    expect(mockOnUndoDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
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
      />
    );

    await user.click(screen.getByRole('dialog'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).not.toHaveBeenCalled();
    expect(mockOnDownload).not.toHaveBeenCalled();
    expect(mockOnMove).not.toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(mockOnUndoDelete).not.toHaveBeenCalled();
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
      />
    );

    expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Item actions');
  });
});