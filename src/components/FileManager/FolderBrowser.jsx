import { useState, useEffect, React } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import Upload from './Upload';
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

        // Use correct filter method based on current folder
        if (currentFolder === '00000000-0000-0000-0000-000000000000') {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', currentFolder);
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;
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

  const navigateUp = () => {
    if (showUploadForm) return;
    if (path.length > 1) {
      const newPath = [...path];
      newPath.pop();
      setCurrentFolder(newPath[newPath.length - 1].id);
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
          metadata: { type: 'folder' }
        });

      if (insertError) throw insertError;

      setShowCreateFolder(false);
      setNewFolderName('');

      // Refresh contents with correct query
      let refreshQuery = supabase
        .from('documents')
        .select('*')
        .order('is_folder', { ascending: false })
        .order('name');

      if (currentFolder === 'root') {
        refreshQuery = refreshQuery.is('parent_id', null);
      } else {
        refreshQuery = refreshQuery.eq('parent_id', currentFolder);
      }

      const { data, error: refreshError } = await refreshQuery;
      
      if (refreshError) throw refreshError;
      setContents(data || []);
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
      setContents(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <article className="folder-browser">
      {/* Error display */}
      {error && (
        <aside className="error-message" role="alert">
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </aside>
      )}

      {/* Breadcrumb navigation */}
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

      {/* Action buttons */}
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

      {/* Create folder form */}
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

      {/* Upload form */}
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

      {/* Contents listing */}
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
                    <button
                      className={`browser-item ${item.is_folder ? 'folder' : 'file'}`}
                      disabled={loading || !item.is_folder}
                      onClick={() => navigateToFolder(item.id, item.name)}
                    >
                    {item.is_folder ? '📁' : '📄'} {item.name}
                    {!item.is_folder && (
                      <mark className="file-type">{item.metadata?.file_type}</mark>
                    )}
                    </button>
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
    </article>
  );
}