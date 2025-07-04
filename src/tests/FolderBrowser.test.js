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
import FileViewer from '../components/FileManager/FileViewer';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../components/FileManager/Upload', () => jest.fn(() => null));
jest.mock('../components/FileManager/Search', () => jest.fn(() => null));
jest.mock('../components/FileManager/Edit', () => jest.fn(() => null));
jest.mock('../components/FileManager/FileViewer', () => jest.fn(() => null));
jest.mock('../components/FileManager/Delete', () => jest.fn(() => null));
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
  const mockFolder = { id: 'folder1', name: 'Folder 1', is_folder: true, parent_id: null, is_deleted: false, metadata: { type: 'folder' }, parentFolder: null };
  const mockSubFolder = { id: 'subfolder1', name: 'Subfolder 1', is_folder: true, parent_id: 'folder1', is_deleted: false, metadata: { type: 'folder' }, parentFolder: { name: 'Folder 1' } };
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
  const mockDocFile = {
    id: 'file2',
    name: 'Document 2',
    is_folder: false,
    parent_id: 'folder1',
    is_deleted: false,
    metadata: { displayName: 'Document 2', file_type: 'docx' },
    storage_path: 'path/to/document2.docx',
    parentFolder: { name: 'Folder 1' },
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });

    // Mock Supabase client
    supabase.from.mockImplementation((table) => {
      if (table === 'documents') {
        const queryBuilder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((cb) => Promise.resolve(cb({ data: [], error: null }))),
        };

        // Mock specific query chains
        queryBuilder.select.mockImplementation((queryString) => {
          if (queryString.includes('parentFolder:documents!parent_id(name)')) {
            return {
              ...queryBuilder,
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              then: jest.fn().mockImplementation((cb) =>
                Promise.resolve(cb({
                  data: [mockFolder, mockSubFolder, mockFile, mockDocFile],
                  error: null,
                }))
              ),
            };
          }
          return queryBuilder;
        });

        queryBuilder.eq.mockImplementation((field, value) => {
          if (field === 'parent_id') {
            return {
              ...queryBuilder,
              order: jest.fn().mockReturnThis(),
              then: jest.fn().mockImplementation((cb) =>
                Promise.resolve(cb({
                  data: value === '00000000-0000-0000-0000-000000000000' ? [mockFolder] : value === 'subfolder1' ? [mockFile] : [mockSubFolder, mockFile, mockDocFile],
                  error: null,
                }))
              ),
            };
          }
          if (field === 'id') {
            return {
              ...queryBuilder,
              then: jest.fn().mockImplementation((cb) =>
                Promise.resolve(cb({
                  data: [mockFolder, mockSubFolder, mockFile, mockDocFile].find((item) => item.id === value) || null,
                  error: null,
                }))
              ),
            };
          }
          return queryBuilder;
        });

        queryBuilder.ilike.mockImplementation((field, value) => {
          if (field === 'name') {
            const searchTerm = value.replace(/%/g, '').toLowerCase();
            return {
              ...queryBuilder,
              then: jest.fn().mockImplementation((cb) =>
                Promise.resolve(cb({
                  data: [mockFolder, mockSubFolder, mockFile, mockDocFile].filter((item) =>
                    item.name.toLowerCase().includes(searchTerm)
                  ),
                  error: null,
                }))
              ),
            };
          }
          return queryBuilder;
        });

        queryBuilder.or.mockImplementation((condition) => {
          const searchTerm = condition.split("'")[1].toLowerCase();
          return {
            ...queryBuilder,
            then: jest.fn().mockImplementation((cb) =>
              Promise.resolve(cb({
                data: [mockFolder, mockSubFolder, mockFile, mockDocFile].filter(
                  (item) =>
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.metadata.displayName.toLowerCase().includes(searchTerm)
                ),
                error: null,
              }))
            ),
          };
        });

        queryBuilder.insert.mockImplementation((data) => ({
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((cb) =>
            Promise.resolve(cb({
              data: data.name === 'Existing Folder' ? [] : [{ id: 'new-folder', name: data.name, is_folder: true }],
              error: data.name === 'Existing Folder' ? { message: 'Duplicate folder name' } : null,
            }))
          ),
        }));

        queryBuilder.update.mockImplementation((data) => ({
          eq: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((cb) =>
            Promise.resolve(cb({
              data: [{ ...mockFile, ...data, parent_id: data.parent_id || mockFile.parent_id }],
              error: null,
            }))
          ),
        }));

        queryBuilder.delete.mockImplementation(() => ({
          eq: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((cb) =>
            Promise.resolve(cb({
              data: null,
              error: null,
            }))
          ),
        }));

        return queryBuilder;
      }
      return {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((cb) =>
          Promise.resolve(cb({
            data: { id: 'folder1', name: 'Folder 1', parent_id: null },
            error: null,
          }))
        ),
      };
    });

    supabase.storage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  afterEach(() => {
    jest.spyOn(console, 'error').mockRestore();
  });

  // Original tests
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByText('Folder 1')).toHaveAttribute('aria-current', 'page');
    });
    await user.click(screen.getByRole('button', { name: 'Go Up' }));
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('handles error from Supabase', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        Promise.resolve(cb({ data: null, error: { message: 'Network error' } }))
      ),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
    });
  });

  test('disables buttons during loading', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        new Promise((resolve) => setTimeout(() => resolve(cb({ data: [], error: null })), 100))
      ),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('handles unauthenticated user', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ user: null });
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        Promise.resolve(cb({ data: [], error: null }))
      ),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
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
    render(<ContentsDisplay contents={[]} loading={false} showSearch={true} hasSearchResults={true} />);
    expect(screen.getByText('No Results Match Your Search')).toBeInTheDocument();
  });

  test('ContentsDisplay renders no filter results', () => {
    render(<ContentsDisplay contents={[]} loading={false} showSearch={false} isFilterActive={true} />);
    expect(screen.getByText('No Results Match Your Filter')).toBeInTheDocument();
  });

  test('ContentsDisplay renders contents list', () => {
    render(
      <ContentsDisplay
        contents={[mockFolder, mockFile]}
        loading={false}
        showSearch={false}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    expect(screen.getByText('pdf')).toHaveClass('file-type');
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
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Folder name')).not.toBeInTheDocument();
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

  test('downloads a file', async () => {
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith('documents');
      expect(supabase.storage.from().download).toHaveBeenCalledWith('path/to/file1.pdf');
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
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(Edit).toHaveBeenCalledWith(
      expect.objectContaining({ item: expect.objectContaining({ id: 'file1' }) }),
      {}
    );
  });

  test('moves a file to another folder', async () => {
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Here' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Open folder Subfolder 1' }));
    await waitFor(() => {
      expect(screen.getByText('Subfolder 1')).toHaveAttribute('aria-current', 'page');
    });
    await user.click(screen.getByRole('button', { name: 'Move Here' }));
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('documents');
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
  });

  test('handles duplicate folder name error', async () => {
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
    await user.type(screen.getByPlaceholderText('Folder name'), 'Existing Folder');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => {
      expect(screen.getByText('Error: Duplicate folder name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Folder name')).toBeInTheDocument();
    });
  });

  test('handles navigation to empty parent folder', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        Promise.resolve(cb({ data: [], error: null }))
      ),
    }));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument();
      expect(screen.getByText('Constitution Archive')).toHaveAttribute('aria-current', 'page');
    });
    expect(screen.queryByRole('button', { name: 'Go Up' })).not.toBeInTheDocument();
  });

  test('isDescendant detects folder hierarchy', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Subfolder 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'Open folder Subfolder 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await userEvent.click(moreActionsButton);
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Here' })).toBeDisabled();
    });
  });

  test('handleDownload handles download error', async () => {
    supabase.storage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({ data: null, error: { message: 'Download failed' } }),
    });
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to download file: Download failed')).toBeInTheDocument();
    });
  });

  test('renders and dismisses error message', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        Promise.resolve(cb({ data: null, error: { message: 'Network error' } }))
      ),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Error:.*Network error/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => {
      expect(screen.queryByText(/Error:.*Network error/i)).not.toBeInTheDocument();
    });
  });

  test('closes context menu on outside click', async () => {
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('handleMoveHere prevents moving to root folder', async () => {
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await user.click(screen.getByRole('button', { name: 'Go Up' }));
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Move Here' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move Here' })).toHaveAttribute('title', 'Moving items into Constitution Archive is not allowed');
    });
  });

  test('renders and clears search UI', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel Search' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Cancel Search' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });
  });

  test('renders filter button only when files exist', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((cb) =>
        Promise.resolve(cb({ data: [mockFolder, mockSubFolder], error: null }))
      ),
    }));
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Subfolder 1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    });
  });

  test('folder items have correct accessibility attributes', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileButton = screen.getByRole('button', { name: 'View file File 1' });
    expect(fileButton).toHaveAttribute('aria-label', 'View file File 1');
    const fileContainer = fileButton.closest('.browser-item-container');
    const contextButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    expect(contextButton).toHaveAttribute('aria-haspopup', 'menu');
    expect(contextButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('ContentsDisplay renders single folder item', () => {
    render(
      <ContentsDisplay
        contents={[mockFolder]}
        loading={false}
        showSearch={false}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    expect(screen.queryByText('View file')).not.toBeInTheDocument();
  });

  test('ContentsDisplay renders single file item', () => {
    render(
      <ContentsDisplay
        contents={[mockFile]}
        loading={false}
        showSearch={false}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    expect(screen.getByText('pdf')).toHaveClass('file-type');
    expect(screen.queryByText('Open folder')).not.toBeInTheDocument();
  });

  test('renders context menu for folder item', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    const folderContainer = screen.getByRole('button', { name: 'Open folder Folder 1' }).closest('.browser-item-container');
    const moreActionsButton = within(folderContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });

  test('ContentsDisplay renders empty state without loading', () => {
    render(
      <ContentsDisplay
        contents={[]}
        loading={false}
        showSearch={false}
        isFilterActive={false}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
    expect(screen.queryByText('Loading contents...')).not.toBeInTheDocument();
  });

  test('cancels new folder creation', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Folder name')).not.toBeInTheDocument();
    });
  });

  test('ContentsDisplay renders no filter results with filter active', () => {
    render(
      <ContentsDisplay
        contents={[]}
        loading={false}
        showSearch={false}
        isFilterActive={true}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByText('No Results Match Your Filter')).toBeInTheDocument();
  });

  test('renders without Edit modal when editModal.show is false', () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(Edit).not.toHaveBeenCalled();
  });

  test('navigateUp does nothing when at root folder', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Constitution Archive')).toHaveAttribute('aria-current', 'page');
      expect(screen.queryByRole('button', { name: 'Go Up' })).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('renderBreadcrumbs renders single breadcrumb at root', () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: 'Folder navigation' })).toBeInTheDocument();
    expect(screen.getByText('Constitution Archive')).toBeInTheDocument();
    expect(screen.queryByText('>>')).not.toBeInTheDocument();
  });

  test('handleMoveHere does nothing when no item is being moved', async () => {
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
      expect(screen.queryByRole('button', { name: 'Move Here' })).not.toBeInTheDocument();
    });
  });

  test('ContentsDisplay disables button for moving item', () => {
    render(
      <ContentsDisplay
        contents={[mockFile]}
        loading={false}
        showSearch={false}
        hasSearchResults={false}
        isFilterActive={false}
        movingItem={mockFile}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByRole('button', { name: 'View file File 1' })).toHaveClass('moving-disabled');
    expect(screen.getByRole('button', { name: 'View file File 1' })).toBeDisabled();
  });

  test('renders filter input when filter is active', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Select filter criteria' })).toBeInTheDocument();
    });
  });

  test('cancels move operation', async () => {
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
      expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
    });
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel Move' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Cancel Move' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Move Here' })).not.toBeInTheDocument();
    });
  });

  test('ContentsDisplay filters out root folder', () => {
    const rootFolder = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Constitution Archive',
      is_folder: true,
    };
    render(
      <ContentsDisplay
        contents={[rootFolder, mockFile]}
        loading={false}
        showSearch={false}
        hasSearchResults={false}
        isFilterActive={false}
        movingItem={null}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.queryByRole('button', { name: 'Open folder Constitution Archive' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View file File 1' })).toBeInTheDocument();
  });

  test('disables upload button at root folder', () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Upload File' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload File' })).toHaveAttribute('title', 'Uploads disabled in Constitution Archive');
  });

  test('context menu trigger has aria-expanded true when open', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    const folderContainer = screen.getByRole('button', { name: 'Open folder Folder 1' }).closest('.browser-item-container');
    const moreActionsButton = within(folderContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await waitFor(() => {
      expect(moreActionsButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test('isDescendant returns false for non-descendant folder', async () => {
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Open folder Folder 1' }));
    const fileContainer = screen.getByRole('button', { name: 'View file File 1' }).closest('.browser-item-container');
    const moreActionsButton = within(fileContainer).getByRole('button', { name: 'More actions' });
    await userEvent.click(moreActionsButton);
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Here' })).not.toBeDisabled();
    });
  });

  test('renders create folder form when showCreateFolder is true', async () => {
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
    expect(screen.getByPlaceholderText('Folder name')).toBeInTheDocument();
  });

  test('create folder form buttons are disabled during loading', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
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
    await user.type(screen.getByPlaceholderText('Folder name'), 'Test Folder');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  test('ContentsDisplay renders empty folder message with loading false', () => {
    render(
      <ContentsDisplay
        contents={[]}
        loading={false}
        showSearch={false}
        hasSearchResults={false}
        isFilterActive={false}
        movingItem={null}
        navigateToFolder={jest.fn()}
        handleContextMenu={jest.fn()}
        handleViewFile={jest.fn()}
        contextMenu={{ show: false, item: null }}
      />
    );
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
  });


  test('move button is disabled at root folder', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FolderBrowser />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open folder Folder 1' })).toBeInTheDocument();
    });
    const folderContainer = screen.getByRole('button', { name: 'Open folder Folder 1' }).closest('.browser-item-container');
    const moreActionsButton = within(folderContainer).getByRole('button', { name: 'More actions' });
    await user.click(moreActionsButton);
    await user.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Move Here' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move Here' })).toHaveAttribute('title', 'Moving items into Constitution Archive is not allowed');
    });
  });

  test('renders breadcrumb separator for multiple path items', async () => {
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
      expect(screen.getByText('>>')).toBeInTheDocument();
    });
  });
});