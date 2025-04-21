import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FolderBrowser, { ContentsDisplay } from '../components/FileManager/FolderBrowser';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';
import Upload from '../components/FileManager/Upload';
import Edit from '../components/FileManager/Edit';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../components/FileManager/Upload', () => jest.fn(() => null));
jest.mock('../components/FileManager/Edit', () => jest.fn(() => null));
jest.mock('../components/FileManager/ContextMenu', () => jest.fn(({ item, onDownload, onDelete, onEdit, onMove }) => (
  <div role="menu">
    <button onClick={() => onDownload && onDownload(item)}>Download</button>
    <button onClick={() => onDelete && onDelete(item)}>Delete</button>
    <button onClick={() => onEdit && onEdit(item)}>Edit</button>
    <button onClick={() => onMove && onMove(item)}>Move</button>
  </div>
)));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('FolderBrowser Component', () => {
  const mockUseAuth = useAuth;
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockFolder = { id: 'folder1', name: 'Folder 1', is_folder: true, parent_id: null, is_deleted: false, metadata: { type: 'folder' } };
  const mockSubFolder = { id: 'subfolder1', name: 'Subfolder 1', is_folder: true, parent_id: 'folder1', is_deleted: false, metadata: { type: 'folder' } };
  const mockFile = {
    id: 'file1',
    name: 'File 1',
    is_folder: false,
    parent_id: 'folder1',
    is_deleted: false,
    metadata: { displayName: 'File 1', file_type: 'pdf' },
    storage_path: 'path/to/file1.pdf',
    parentFolder: { name: 'Folder 1' },
  };
  const mockDeletedFile = {
    id: 'file2',
    name: 'File 2',
    is_folder: false,
    parent_id: 'folder1',
    is_deleted: true,
    metadata: { displayName: 'File 2', file_type: 'txt' },
    storage_path: 'path/to/file2.txt',
    parentFolder: { name: 'Folder 1' },
  };
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    supabase.from.mockImplementation((table) => {
      if (table === 'documents') {
        return {
          select: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: [mockFolder, mockSubFolder, mockFile],
              error: null,
            }),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'file3',
                  name: 'File 3',
                  is_folder: false,
                  parent_id: 'folder1',
                  metadata: { displayName: 'File 3', file_type: 'pdf' },
                  parentFolder: { name: 'Folder 1' },
                },
              ],
              error: null,
            }),
            ilike: jest.fn().mockResolvedValue({
              data: [{ id: 'file1', name: 'File 1', is_folder: false, parent_id: 'folder1', is_deleted: false, metadata: { displayName: 'File 1', file_type: 'pdf' } }],
              error: null,
            }),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'folder1', name: 'Folder 1', parent_id: null },
              error: null,
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not authenticated' } }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'folder1', name: 'Folder 1', parent_id: null },
          error: null,
        }),
      };
    });
    supabase.storage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
    });
  });

  afterEach(() => {
    jest.spyOn(console, 'error').mockRestore();
  });

  test('renders loading state initially', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading contents...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toBeInTheDocument();
    });
  });

  test('renders breadcrumbs with root folder', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Folder navigation' })).toBeInTheDocument();
    });
  });

  test('renders action buttons', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    });
  });

  test('fetches and displays folder contents', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('documents');
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
      expect(screen.getByText('pdf')).toHaveClass('file-type');
    });
  });

  test('navigates to subfolder', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('navigates up to parent folder', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await user.click(screen.getByRole('button', { name: 'Go Up' }));
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('handles error from Supabase', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  test('disables buttons during loading', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue(new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 0))),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toBeInTheDocument();
    });
  });

  test('disables search and upload in root folder', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload File' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    });
  });

  test('handles unauthenticated user', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: null });
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'New Folder' }));
    await user.type(screen.getByPlaceholderText('Folder name'), 'New Folder');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => {
      expect(screen.getByText('Error: Not authenticated')).toBeInTheDocument();
    });
  });

  test('ContentsDisplay renders loading state', () => {
    render(<ContentsDisplay contents={[]} loading={true} showSearch={false} />);
    expect(screen.getByText('Loading contents...')).toBeInTheDocument();
  });

  test('ContentsDisplay renders empty folder message', () => {
    render(<ContentsDisplay contents={[]} loading={false} showSearch={false} />);
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
  });

  test('ContentsDisplay renders no search results', () => {
    render(<ContentsDisplay contents={[]} loading={false} showSearch={true} />);
    expect(screen.getByText('No Results Match Your Search')).toBeInTheDocument();
  });

  test('ContentsDisplay renders no filter results', () => {
    render(<ContentsDisplay contents={[]} loading={false} showSearch={false} filterCriteria="file_type" />);
    expect(screen.getByText('No Results Match Your Filter')).toBeInTheDocument();
  });

  test('ContentsDisplay renders contents list', () => {
    render(
      <ContentsDisplay
        contents={[mockFolder, mockFile]}
        loading={false}
        showSearch={false}
        navigateToFolder={jest.fn()}
        handleFileDoubleClick={jest.fn()}
        handleContextMenu={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    expect(screen.getByText('pdf')).toHaveClass('file-type');
  });

  test('handles null data from Supabase', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  test('handles file double-click navigation in search mode', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search files in this folder ...')).toBeInTheDocument();
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'documents') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'folder1', name: 'Folder 1', parent_id: null },
              error: null,
            }),
            is: jest.fn().mockResolvedValue({
              data: [mockFile],
              error: null,
            }),
            order: jest.fn().mockReturnThis(),
          }),
        };
      }
      return {};
    });
    await user.dblClick(screen.getByRole('button', { name: 'View file File 1' }));
    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toHaveAttribute('aria-current', 'page');
    }, { timeout: 3000 });
  });

  test('opens context menu for file', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  test('handles empty folder contents', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: [], error: null }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  test('handles invalid folder ID navigation', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: [], error: { message: 'Invalid folder ID' } }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter initialEntries={['/folder/invalid']}>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  test('creates a new folder successfully', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'New Folder' }));
    await user.type(screen.getByPlaceholderText('Folder name'), 'New Folder');
    supabase.from.mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'new-folder' }], error: null }),
      }),
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: [mockFolder, mockFile], error: null }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Folder name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
  });

  test('toggles upload form', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toHaveAttribute('aria-current', 'page');
    });
    await user.click(screen.getByRole('button', { name: 'Upload File' }));
    expect(Upload).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'folder1' }),
      {}
    );
    await user.click(screen.getByRole('button', { name: 'Cancel Upload' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
    });
  });

  test('applies file type filter', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('button', { name: 'File Type' }));
    await user.type(screen.getByPlaceholderText('Enter file extension (e.g., pdf)'), 'pdf');
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({ data: [mockFile], error: null }),
      }),
    }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Open folder Folder 1' })).not.toBeInTheDocument();
    });
  });

  test('downloads a file', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('documents');
      expect(supabase.storage.from().download).toHaveBeenCalledWith('path/to/file1.pdf');
    });
  });

  test('soft deletes a file', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    supabase.from.mockImplementation(() => ({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: [], error: null }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    });
  });

  test('handles fetchContents error logging', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockRejectedValue(new Error('Database error')),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching contents:', expect.any(Error));
      expect(screen.getByText('Error: Database error')).toBeInTheDocument();
    });
    consoleErrorSpy.mockRestore();
  });

  test('performs search in subfolder', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search files in this folder ...')).toBeInTheDocument();
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'documents') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [mockFile],
              error: null,
            }),
            is: jest.fn().mockResolvedValue({
              data: [mockFile],
              error: null,
            }),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'folder1', name: 'Folder 1', parent_id: null },
              error: null,
            }),
          }),
        };
      }
      return {};
    });
    await user.type(screen.getByPlaceholderText('Search files in this folder ...'), 'File 1');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
      expect(screen.getByText('(in Folder 1)')).toBeInTheDocument();
    });
  });

  test('handles move item to valid folder', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(screen.getByRole('button', { name: 'Go Up' }));
    supabase.from.mockImplementation(() => ({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      select: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ data: [mockFolder, mockFile], error: null }),
        order: jest.fn().mockReturnThis(),
      }),
    }));
    await user.click(screen.getByRole('button', { name: 'Move Here' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
  });

  test('opens edit modal via context menu', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(Edit).toHaveBeenCalledWith(
      expect.objectContaining({ item: expect.objectContaining({ id: 'file1' }) }),
      {}
    );
  });

  test('renders moving item state', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toHaveAttribute('aria-current', 'page');
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton, { button: 2 });
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Here' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel Move' })).toBeInTheDocument();
    });
  });
});