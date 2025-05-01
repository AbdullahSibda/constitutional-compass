import { useState, useEffect } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import Upload from './Upload';
import Edit from './Edit';
import Search from './Search';
import ContextMenu from './ContextMenu';
import Delete from './Delete';
import Filter from './Filter';
import { documentTypes } from './documentTypes';
import './FolderBrowser.css';

const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000000';

function FolderBrowser() {
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState('00000000-0000-0000-0000-000000000000');
  const [contents, setContents] = useState([]);
  const [path, setPath] = useState([{ id: '00000000-0000-0000-0000-000000000000', name: 'Constitution Archive' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, item: null });
  const [deletedItems, setDeletedItems] = useState(new Set());
  const [editModal, setEditModal] = useState({ show: false, item: null });
  const [movingItem, setMovingItem] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false); // New state to track filter activity

  useEffect(() => {
    if (showUploadForm) return;

    const fetchContents = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('documents')
          .select(`
            *,
            parentFolder:documents!parent_id(name)
          `)
          .order('is_folder', { ascending: false })
          .order('name', { ascending: true });
        query = query.eq('parent_id', currentFolder);
        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        const validData = Array.isArray(data) ? data : [];
        const deletedIds = new Set(data.filter(item => item.is_deleted).map(item => item.id));
        setDeletedItems(deletedIds);
        setContents(validData.map(item => ({
          ...item,
          parentFolder: item.parentFolder ? { name: item.parentFolder.name } : null
        })));
      } catch (err) {
        console.error('Error fetching contents:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [currentFolder, showUploadForm]);

  const navigateToFolder = (folderId, folderName) => {
    if (showUploadForm || (movingItem && movingItem.id === folderId)) return;
    setCurrentFolder(folderId);
    setPath([...path, { id: folderId, name: folderName }]);
  };

  const isDescendant = (folderId, potentialParentId) => {
    if (folderId === potentialParentId) return true;
    const parent = contents.find(item => item.id === potentialParentId);
    if (!parent?.parent_id) return false;
    return isDescendant(folderId, parent.parent_id);
  };

  const handleMoveHere = async () => {
    if (!movingItem) return;
    if (movingItem.is_folder && isDescendant(currentFolder, movingItem.id)) {
      setError("Cannot move a folder into its own subfolder");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ parent_id: currentFolder })
        .eq('id', movingItem.id);
      if (error) throw error;
      refreshContents();
      setMovingItem(null);
    } catch (err) {
      setError('Failed to move item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (contextMenu.show && contextMenu.item?.id === item.id) {
      closeContextMenu();
      return;
    }
    setContextMenu({ show: true, item });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, item: null });
  };

  const handleDownload = async (item) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(item.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file: ' + err.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu.show && !e.target.closest('.context-menu-popup')) {
        closeContextMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.show]);

  const navigateUp = () => {
    if (showUploadForm) return;
    if (path.length > 1) {
      const newPath = [...path];
      newPath.pop();
      setCurrentFolder(newPath[newPath.length - 1].id);
      setContextMenu({ show: false, item: null });
      setPath(newPath);
    }
  };

  const checkFolderNameExists = async (folderName) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('is_folder', true)
        .eq('parent_id', currentFolder)
        .ilike('name', folderName);
      
      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('Error checking folder name:', err);
      setError('Failed to validate folder name');
      return true;
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const nameExists = await checkFolderNameExists(newFolderName);
      if (nameExists) {
        throw new Error('A folder with this name already exists in this location');
      }
  
      if (!user) throw new Error('Not authenticated');
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: newFolderName,
          is_folder: true,
          parent_id: currentFolder,
          created_by: user.id,
          metadata: { type: 'folder' },
          is_deleted: false
        })
        .select();
      
      if (insertError) throw insertError;
      setShowCreateFolder(false);
      setNewFolderName('');
      refreshContents();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshContents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          parentFolder:documents!parent_id(name)
        `)
        .order('is_folder', { ascending: false })
        .order('name');
      query = query.eq('parent_id', currentFolder);
      const { data, error } = await query;
      if (error) throw error;
      const deletedIds = new Set(data.filter(item => item.is_deleted).map(item => item.id));
      setDeletedItems(deletedIds);
      setContents(data.map(item => ({
        ...item,
        parentFolder: item.parentFolder ? { name: item.parentFolder.name } : null
      })) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResults = (results) => {
    setContents(results);
    setHasSearchResults(true);
  };

  const handleClearSearch = () => {
    setIsSearchActive(false);
    setHasSearchResults(false);
    refreshContents();
  };

  const renderBreadcrumbs = () => (
    <nav className="breadcrumbs" aria-label="Folder navigation">
      {path.map((item, index) => (
        <figure key={item.id} className="breadcrumb-wrapper">
          <button
            onClick={() => {
              setCurrentFolder(item.id);
              setPath(path.slice(0, index + 1));
            }}
            className="breadcrumb-item"
            disabled={loading || currentFolder === item.id}
            aria-current={currentFolder === item.id ? "page" : undefined}
          >
            {item.name}
          </button>
          {index < path.length - 1 && (
            <strong className="breadcrumb-separator" aria-hidden="true">{'>>'}</strong>
          )}
        </figure>
      ))}
    </nav>
  );

  const renderCreateFolderForm = () => (
    <form className="create-folder" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="folder-name" className="visually-hidden">Folder name</label>
      <input
        id="folder-name"
        type="text"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder="Folder name"
        disabled={loading}
      />
      {error?.includes('already exists') && (
        <p className="validation-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={createFolder} disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      <button type="button" onClick={() => {
        setShowCreateFolder(false);
        setError(null);
      }} disabled={loading}>
        Cancel
      </button>
    </form>
  );

  return (
    <article className="folder-browser">
      {error && (
        <aside className="error-message" role="alert">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </aside>
      )}

      {!showUploadForm && renderBreadcrumbs()}

      <menu className="browser-actions">
        {!showUploadForm && (
          <li>
            <button onClick={() => setShowCreateFolder(!showCreateFolder)} disabled={loading}>
              {loading ? 'Loading...' : 'New Folder'}
            </button>
          </li>
        )}
        <li>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            disabled={loading || currentFolder === ROOT_FOLDER_ID}
            className={showUploadForm ? 'cancel-button' : 'upload-button'}
            title={currentFolder === ROOT_FOLDER_ID ? "Uploads disabled in Constitution Archive" : ""}
          >
            {showUploadForm ? 'Cancel Upload' : 'Upload File'}
          </button>
        </li>
        {!showUploadForm && path.length > 1 && (
          <li>
            <button onClick={navigateUp} disabled={loading}>Go Up</button>
          </li>
        )}
        {movingItem && (
          <li>
            <button
              onClick={handleMoveHere}
              disabled={loading || (movingItem.is_folder && isDescendant(currentFolder, movingItem.id))}
              className="move-button"
            >
              Move Here
            </button>
          </li>
        )}
        {movingItem && (
          <li>
            <button onClick={() => setMovingItem(null)} disabled={loading} className="cancel-button">
              Cancel Move
            </button>
          </li>
        )}
        <li>
          <button
            onClick={() => setIsSearchActive(!isSearchActive)}
            disabled={loading || showUploadForm}
            className={isSearchActive ? 'active-search-button' : ''}
          >
            {isSearchActive ? 'Cancel Search' : 'Search'}
          </button>
        </li>
        {!showUploadForm && contents.some(item => !item.is_folder) && (
          <li>
            <button
              onClick={() => {
                setIsFilterActive(!isFilterActive);
                if (isFilterActive) {
                  refreshContents(); 
                }
              }}
              disabled={loading}
              className={isFilterActive ? 'active-filter-button' : ''}
            >
              {isFilterActive ? 'Cancel Filter' : 'Filter'}
            </button>
          </li>
        )}
        {isFilterActive && (
          <li>
            <Filter
              currentFolder={currentFolder}
              onFilterResults={(results) => {
                setContents(results);
              }}
              onFilterError={setError}
              onFilterActive={(active) => {
                setIsFilterActive(active);
                if (!active) {
                  refreshContents();
                }
              }}
              renderFilterInput={({ filterCriteria, setFilterCriteria, filterValue, setFilterValue, handleApplyFilter, handleClearFilter }) => (
                <section className="filter-input-container">
                  <select
                    value={filterCriteria}
                    onChange={(e) => setFilterCriteria(e.target.value)}
                    aria-label="Select filter criteria"
                  >
                    <option value="">Select filter criteria</option>
                    <option value="year">Year</option>
                    <option value="file_type">File Type</option>
                    <option value="type">Document Type</option>
                  </select>
                  {filterCriteria && (
                    <>
                      {filterCriteria === 'year' || filterCriteria === 'file_type' ? (
                        <input
                          type="text"
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          placeholder={`Enter ${filterCriteria === 'year' ? 'year (e.g., 2023)' : 'file extension (e.g., pdf)'}`}
                          aria-label={`Enter ${filterCriteria === 'year' ? 'year' : 'file type'}`}
                        />
                      ) : (
                        <select
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          aria-label="Select document type"
                        >
                          <option value="">Select a type</option>
                          {documentTypes.map(group => (
                            <optgroup key={group.group} label={group.group}>
                              {group.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                      <button onClick={handleApplyFilter} disabled={!filterValue}>
                        Apply
                      </button>
                      <button onClick={handleClearFilter}>Clear</button>
                    </>
                  )}
                </section>
              )}
            />
          </li>
        )}
      </menu>
      {!showUploadForm && showCreateFolder && renderCreateFolderForm()}

      {showUploadForm && currentFolder !== ROOT_FOLDER_ID && (
        <section className="upload-focus-view" aria-labelledby="upload-heading">
          <Upload
            parentId={currentFolder}
            onUploadSuccess={() => {
              refreshContents();
              setShowUploadForm(false);
            }}
            onCancel={() => setShowUploadForm(false)}
          />
        </section>
      )}

      {!showUploadForm && (
        <ContentsDisplay
          contents={contents}
          loading={loading}
          showSearch={isSearchActive}
          hasSearchResults={hasSearchResults}
          isFilterActive={isFilterActive} 
          movingItem={movingItem}
          navigateToFolder={navigateToFolder}
          handleContextMenu={handleContextMenu}
          contextMenu={contextMenu}
        />
      )}

      {isSearchActive && (
        <Search
          currentFolder={currentFolder}
          onSearchResults={handleSearchResults}
          onSearchError={setError}
          onClearSearch={handleClearSearch}
        />
      )}

      <Delete
        item={contextMenu.item}
        onSuccess={(itemId, isDeleted = true) => {
          setDeletedItems(prev => {
            const newSet = new Set(prev);
            isDeleted ? newSet.add(itemId) : newSet.delete(itemId);
            return newSet;
          });
          refreshContents();
        }}
        onError={setError}
      />

      {editModal.show && (
        <Edit
          item={editModal.item}
          onEditSuccess={() => {
            refreshContents();
            setEditModal({ show: false, item: null });
          }}
          onCancel={() => setEditModal({ show: false, item: null })}
        />
      )}

      {contextMenu.show && (
        <ContextMenu
          item={contextMenu.item}
          onEdit={() => {
            setEditModal({ show: true, item: contextMenu.item });
            closeContextMenu();
          }}
          onDelete={() => {
            setDeletedItems(prev => {
              const newSet = new Set(prev);
              newSet.add(contextMenu.item.id);
              return newSet;
            });
            refreshContents();
          }}
          onUndoDelete={() => {
            setDeletedItems(prev => {
              const newSet = new Set(prev);
              newSet.delete(contextMenu.item.id);
              return newSet;
            });
            refreshContents();
          }}
          onDownload={() => handleDownload(contextMenu.item)}
          onMove={() => {
            setMovingItem(contextMenu.item);
            closeContextMenu();
          }}
          isDeleted={deletedItems.has(contextMenu.item?.id)}
          onClose={closeContextMenu}
        />
      )}
    </article>
  );
}

export function ContentsDisplay({ contents, loading, showSearch, hasSearchResults, isFilterActive, movingItem, navigateToFolder, handleContextMenu, contextMenu }) {
  if (loading) {
    return <p className="loading-indicator">Loading contents...</p>;
  }

  if (contents.length > 0) {
    return (
      <ul className="contents-list">
        {contents
          .filter(item => !(item.is_folder && item.id === '00000000-0000-0000-0000-000000000000'))
          .map((item) => (
            <li key={item.id} className="browser-item-container">
              <article className={`browser-item ${item.is_folder ? 'folder' : 'file'}`}>
                <button
                  className={`item-main-action ${movingItem?.id === item.id ? 'moving-disabled' : ''}`}
                  disabled={loading || (movingItem && movingItem.id === item.id)}
                  onClick={() => item.is_folder && navigateToFolder(item.id, item.name)}
                  aria-label={item.is_folder ? `Open folder ${item.name}` : `View file ${item.name}`}
                >
                  {item.is_folder ? '📁' : '📄'} 
                  {item.metadata?.displayName || item.name}
                  {!item.is_folder && <mark className="file-type">{item.metadata?.file_type}</mark>}
                  {showSearch && hasSearchResults && !item.is_folder && (
                    <small className="file-location"> (in {item.parentFolder?.name || 'Constitution Archive'})</small>
                  )}
                </button>
                <button
                  className="context-menu-trigger"
                  aria-haspopup="menu"
                  aria-expanded={contextMenu.show && contextMenu.item?.id === item.id}
                  onClick={(e) => handleContextMenu(e, item)}
                  aria-label="More actions"
                >
                  ⋮
                </button>
              </article>
            </li>
          ))}
      </ul>
    );
  }

  if (showSearch && hasSearchResults) {
    return (
      <article className="no-search-results">
        <p className="empty-icon" aria-hidden="true">🔍</p>
        <h2 className="empty-text">No Results Match Your Search</h2>
      </article>
    );
  }

  if (isFilterActive) {
    return (
      <article className="no-filter-results">
        <p className="empty-icon" aria-hidden="true">🔍</p>
        <h2 className="empty-text">No Results Match Your Filter</h2>
      </article>
    );
  }

  return (
    <article className="empty-folder-message">
      <p className="empty-icon" aria-hidden="true">📂</p>
      <h2 className="empty-text">This folder is empty</h2>
    </article>
  );
}

export default FolderBrowser;