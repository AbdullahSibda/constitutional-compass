import { useState, useEffect, React } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import Upload from './Upload';
import Edit from './Edit';
import './FolderBrowser.css';

export default function FolderBrowser() {
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState('00000000-0000-0000-0000-000000000000');
  const [contents, setContents] = useState([]);
  const [path, setPath] = useState([{ id: '00000000-0000-0000-0000-000000000000', name: 'Constitution Archive' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    show: false,
    item: null
  });
  const [deletedItems, setDeletedItems] = useState(new Set());
  const [editModal, setEditModal] = useState({
    show: false,
    item: null
  });

  // Fetch folder contents
  useEffect(() => {
    if (showUploadForm) return; 

    const fetchContents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('documents')
          .select('*')
          .order('is_folder', { ascending: false })
          .order('name');

        if (currentFolder === '00000000-0000-0000-0000-000000000000') {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', currentFolder);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
        
        // Update deletedItems based on fetched data
        const deletedIds = new Set(data.filter(item => item.is_deleted).map(item => item.id));
        setDeletedItems(deletedIds);
        setContents(data || []);
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
    if (showUploadForm) return;
    setCurrentFolder(folderId);
    setPath([...path, { id: folderId, name: folderName }]);
  };

  const ContextMenu = ({ item, onEdit, onDelete, onUndoDelete, onDownload, onClose, isDeleted }) => {
    return (
      <dialog
        className="context-menu-overlay"
        onClick={onClose}
        open
      >
        <menu 
          className="context-menu-popup"
          aria-label="Item actions"
          onClick={(e) => e.stopPropagation()}
        >
          <li>
            <button 
              className="context-menu-item"
              onClick={() => {
                onEdit();
                onClose();
              }}
            >
              Edit Metadata
            </button>
          </li>
          {!item.is_folder && (
            <li>
              <button 
                className="context-menu-item"
                onClick={() => {
                  onDownload();
                  onClose();
                }}
              >
                Download
              </button>
            </li>
          )}
          <li>
            <button 
              className="context-menu-item delete"
              onClick={() => {
                isDeleted ? onUndoDelete() : onDelete();
                onClose();
              }}
            >
              {isDeleted ? 'Undo Delete' : (item.is_folder ? 'Delete Folder' : 'Delete File')}
            </button>
          </li>
        </menu>
      </dialog>
    );
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if clicking same item to toggle
    if (contextMenu.show && contextMenu.item?.id === item.id) {
      closeContextMenu();
      return;
    }

    setContextMenu({
      show: true,
      item
    });
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

  const softDeleteItem = async (item) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true })
        .eq('id', item.id);

      if (error) throw error;
      
      setDeletedItems(prev => new Set(prev).add(item.id));
      refreshContents();
    } catch (err) {
      setError('Failed to delete item: ' + err.message);
    }
  };

  const undoDelete = async (item) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: false })
        .eq('id', item.id);

      if (error) throw error;
      
      setDeletedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      refreshContents();
    } catch (err) {
      setError('Failed to restore item: ' + err.message);
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

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: newFolderName,
          is_folder: true,
          parent_id: currentFolder === 'root' ? null : currentFolder,
          created_by: user.id,
          metadata: { type: 'folder' },
          is_deleted: false
        });

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
        .select('*')
        .order('is_folder', { ascending: false })
        .order('name');

      if (currentFolder === '00000000-0000-0000-0000-000000000000') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', currentFolder);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Update deletedItems based on fetched data
      const deletedIds = new Set(data.filter(item => item.is_deleted).map(item => item.id));
      setDeletedItems(deletedIds);
      setContents(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="folder-browser">
      {error && (
        <aside className="error-message" role="alert">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </aside>
      )}

      {!showUploadForm && (
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
                <strong className="breadcrumb-separator" aria-hidden="true">
                  &gt;&gt;
                </strong>
              )}
            </figure>
          ))}
        </nav>
      )}

      <menu className="browser-actions">
        {!showUploadForm && (
          <li>
            <button 
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'New Folder'}
            </button>
          </li>
        )}
        <li>
          <button 
            onClick={() => setShowUploadForm(!showUploadForm)}
            disabled={loading || currentFolder === '00000000-0000-0000-0000-000000000000'}
            className={showUploadForm ? 'cancel-button' : 'upload-button'}
            title={currentFolder === '00000000-0000-0000-0000-000000000000' ? 
                  "Uploads disabled in Constitution Archive" : ""}
          >
            {showUploadForm ? 'Cancel Upload' : 'Upload File'}
          </button>
        </li>
        {!showUploadForm && path.length > 1 && (
          <li>
            <button onClick={navigateUp} disabled={loading}>
              Go Up
            </button>
          </li>
        )}
      </menu>

      {!showUploadForm && showCreateFolder && (
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
          <button type="button" onClick={createFolder} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button 
            type="button"
            onClick={() => setShowCreateFolder(false)} 
            disabled={loading}
          >
            Cancel
          </button>
        </form>
      )}

      {showUploadForm && (
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
        <section className="browser-contents" aria-live="polite">
          {loading ? (
            <p className="loading-indicator">Loading contents...</p>
          ) : contents.length > 0 ? (
            <ul className="contents-list">
              {contents
                .filter(item => 
                  !(item.is_folder && item.id === '00000000-0000-0000-0000-000000000000')
                )
                .map((item) => (
                  <li key={item.id} className="browser-item-container">
                    <article className={`browser-item ${item.is_folder ? 'folder' : 'file'}`}>
                      <button
                        className="item-main-action"
                        disabled={loading}
                        onClick={() => {
                          if (item.is_folder) {
                            navigateToFolder(item.id, item.name);
                          }
                        }}
                        aria-label={item.is_folder ? `Open folder ${item.name}` : `View file ${item.name}`}
                      >
                        {item.is_folder ? '📁' : '📄'} 
                        {item.metadata?.displayName || item.name}
                        {!item.is_folder && (
                          <mark className="file-type">{item.metadata?.file_type}</mark>
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
          ) : (
            <article className="empty-folder-message">
              <p className="empty-icon" aria-hidden="true">📂</p>
              <h2 className="empty-text">This folder is empty</h2>
            </article>
          )}
        </section>
      )}

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
          onDelete={() => softDeleteItem(contextMenu.item)}
          onUndoDelete={() => undoDelete(contextMenu.item)}
          onDownload={() => handleDownload(contextMenu.item)}
          isDeleted={deletedItems.has(contextMenu.item?.id)}
          onClose={closeContextMenu}
        />
      )}
    </article>
  );
}