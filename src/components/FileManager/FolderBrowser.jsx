import { useState, useEffect, React } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import Upload from './Upload';
import Edit from './Edit';
import ContextMenu from './ContextMenu';
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
  const [contextMenu, setContextMenu] = useState({ show: false, item: null });
  const [deletedItems, setDeletedItems] = useState(new Set());
  const [editModal, setEditModal] = useState({ show: false, item: null });
  const [movingItem, setMovingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState(null);
  const [filterValue, setFilterValue] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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
    if (showUploadForm || (movingItem && movingItem.id === folderId)) return;
    setCurrentFolder(folderId);
    setPath([...path, { id: folderId, name: folderName }]);
  };

  const isDescendant = (folderId, potentialParentId) => {
    if (folderId === potentialParentId) return true;
    const parent = contents.find(item => item.id === potentialParentId);
    if (!parent || !parent.parent_id) return false;
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
        .update({ parent_id: currentFolder === '00000000-0000-0000-0000-000000000000' ? null : currentFolder })
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

  const handleSearch = async () => {
    if (currentFolder === '00000000-0000-0000-0000-000000000000') {
      setError('Search is disabled in the Constitution Archive');
      return;
    }
    if (!searchQuery.trim()) {
      setFilterCriteria(null);
      setFilterValue('');
      refreshContents();
      return;
    }
    setLoading(true);
    setError(null);
    setFilterCriteria(null);
    setFilterValue('');
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          parentFolder:parent_id(name)
        `)
        .eq('is_deleted', false)
        .eq('is_folder', false)
        .or(
          `metadata->>displayName.ilike.%${searchQuery}%,` +
          `metadata->>type.ilike.%${searchQuery}%,` +
          `metadata->>file_type.ilike.%${searchQuery}%,` +
          `metadata->>year.ilike.%${searchQuery}%`
        );
      const allSubfolderIds = await getAllSubfolderIds(currentFolder);
      const searchFolders = [currentFolder, ...allSubfolderIds];
      query = query.in('parent_id', searchFolders);
      const { data, error } = await query;
      if (error) throw error;
      const transformedData = data.map(item => ({
        ...item,
        parentFolder: item.parentFolder ? { name: item.parentFolder.name } : null
      }));
      setContents(transformedData);
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDoubleClick = async (file) => {
    if (!file.parentFolder) return;
    const newPath = await buildPathToFile(file);
    setPath(newPath);
    setCurrentFolder(file.parent_id);
    setSearchQuery('');
    setShowSearch(false);
    refreshContents();
  };

  const buildPathToFile = async (file) => {
    const path = [];
    let currentId = file.parent_id;
    const { data: parent } = await supabase
      .from('documents')
      .select('id, name, parent_id')
      .eq('id', currentId)
      .single();
    if (parent) {
      path.unshift({ id: parent.id, name: parent.name });
      currentId = parent.parent_id;
    }
    while (currentId && currentId !== '00000000-0000-0000-0000-000000000000') {
      const { data: folder } = await supabase
        .from('documents')
        .select('id, name, parent_id')
        .eq('id', currentId)
        .single();
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    path.unshift({ id: '00000000-0000-0000-0000-000000000000', name: 'Constitution Archive' });
    return path;
  };

  const getAllSubfolderIds = async (folderId) => {
    const ids = [];
    if (folderId === '00000000-0000-0000-0000-000000000000') return ids;
    const queue = [folderId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('parent_id', currentId)
        .eq('is_folder', true)
        .eq('is_deleted', false);
      if (error) {
        console.error('Error fetching subfolder IDs:', error);
        throw error;
      }
      data.forEach(folder => {
        ids.push(folder.id);
        queue.push(folder.id);
      });
    }
    return ids;
  };

  const handleApplyFilter = async () => {
    if (!filterCriteria || !filterValue) {
      refreshContents();
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('is_folder', false)
        .eq('parent_id', currentFolder === '00000000-0000-0000-0000-000000000000' ? null : currentFolder);
      if (filterCriteria === 'file_type') {
        query = query.ilike('metadata->>file_type', `%${filterValue}%`);
      } else {
        query = query.eq(`metadata->>${filterCriteria}`, filterValue);
      }
      const { data, error } = await query;
      if (error) throw error;
      setContents(data || []);
    } catch (err) {
      setError('Filter failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setFilterCriteria(null);
    setFilterValue('');
    refreshContents();
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
      if (!user) throw new Error('Not authenticated');
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: newFolderName,
          is_folder: true,
          parent_id: currentFolder === '00000000-0000-0000-0000-000000000000' ? null : currentFolder,
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
        .select('*')
        .order('is_folder', { ascending: false })
        .order('name')
        .eq('is_deleted', false);
      if (currentFolder === '00000000-0000-0000-0000-000000000000') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', currentFolder);
      }
      const { data, error } = await query;
      if (error) throw error;
      const deletedIds = new Set(data.filter(item => item.is_deleted).map(item => item.id));
      setDeletedItems(deletedIds);
      setContents(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchToggle = () => {
    if (currentFolder === '00000000-0000-0000-0000-000000000000') {
      setError('Search is disabled in the Constitution Archive');
      return;
    }
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
      refreshContents();
    }
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
      <button type="button" onClick={createFolder} disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      <button type="button" onClick={() => setShowCreateFolder(false)} disabled={loading}>
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
            disabled={loading || currentFolder === '00000000-0000-0000-0000-000000000000'}
            className={showUploadForm ? 'cancel-button' : 'upload-button'}
            title={currentFolder === '00000000-0000-0000-0000-000000000000' ? "Uploads disabled in Constitution Archive" : ""}
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
              disabled={loading || currentFolder === '00000000-0000-0000-0000-000000000000' || (movingItem.is_folder && isDescendant(currentFolder, movingItem.id))}
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
            onClick={handleSearchToggle}
            disabled={loading || currentFolder === '00000000-0000-0000-0000-000000000000'}
            className={showSearch ? 'active-search-button' : ''}
            title={currentFolder === '00000000-0000-0000-0000-000000000000' ? "Search disabled in Constitution Archive" : ""}
          >
            {showSearch ? 'Cancel Search' : 'Search'}
          </button>
        </li>
        {contents.some(item => !item.is_folder) && (
          <li className="filter-container">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)}>Filter</button>
            {showFilterDropdown && (
              <menu className="filter-dropdown">
                <button onClick={() => setFilterCriteria('type')}>Type</button>
                <button onClick={() => setFilterCriteria('year')}>Year</button>
                <button onClick={() => setFilterCriteria('file_type')}>File Type</button>
              </menu>
            )}
          </li>
        )}
      </menu>

      {!showUploadForm && showCreateFolder && renderCreateFolderForm()}

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
        <ContentsDisplay
          contents={contents}
          loading={loading}
          showSearch={showSearch}
          movingItem={movingItem}
          navigateToFolder={navigateToFolder}
          handleFileDoubleClick={handleFileDoubleClick}
          handleContextMenu={handleContextMenu}
          contextMenu={contextMenu}
          filterCriteria={filterCriteria}
        />
      )}

      {showSearch && currentFolder !== '00000000-0000-0000-0000-000000000000' && (
        <search className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in this folder ..."
            disabled={loading}
          />
          <button onClick={handleSearch} disabled={loading}>Search</button>\
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
              refreshContents();
            }}
            disabled={loading}
          >
            Clear Search
          </button>
        </search>
      )}

      {filterCriteria && (
        <section className="filter-input-container">
          {filterCriteria === 'year' || filterCriteria === 'file_type' ? (
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder={`Enter ${filterCriteria === 'year' ? 'year (e.g., 2023)' : 'file extension (e.g., pdf)'}`}
            />
          ) : (
            <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
              <option value="">Select a type</option>
              <optgroup label="Constitutional Documents">
                <option value="constitution_1996">Constitution of South Africa (1996)</option>
                <option value="interim_constitution">Interim Constitution (1993)</option>
                <option value="constitutional_amendment">Constitutional Amendment</option>
                <option value="bill_of_rights">Bill of Rights</option>
                <option value="founding_principles">Founding Principles Document</option>
              </optgroup>
              <optgroup label="Legislation">
                <option value="act_of_parliament">Act of Parliament</option>
                <option value="regulation">Government Regulation</option>
                <option value="bylaw">Municipal By-law</option>
                <option value="white_paper">White Paper</option>
                <option value="green_paper">Green Paper</option>
                <option value="policy_document">Policy Document</option>
              </optgroup>
              <optgroup label="Judicial Documents">
                <option value="constitutional_court">Constitutional Court Ruling</option>
                <option value="supreme_court_appeal">Supreme Court of Appeal Decision</option>
                <option value="high_court">High Court Decision</option>
                <option value="magistrate_ruling">Magistrate Court Ruling</option>
                <option value="legal_opinion">Legal Opinion</option>
              </optgroup>
              <optgroup label="Human Rights Documents">
                <option value="south_african_hr_commission">SA Human Rights Commission Report</option>
                <option value="udhr">Universal Declaration of Human Rights</option>
                <option value="african_charter">African Charter on Human and Peoples' Rights</option>
                <option value="iccpr">ICCPR Document</option>
                <option value="icescr">ICESCR Document</option>
                <option value="cedaw">CEDAW Document</option>
                <option value="crc">Convention on the Rights of the Child</option>
              </optgroup>
              <optgroup label="Historical Documents">
                <option value="freedom_charter">Freedom Charter (1955)</option>
                <option value="rivieraconference">Rivonia Trial Documents</option>
                <option value="codesa_documents">CODESA Negotiation Records</option>
                <option value="truth_reconciliation">Truth & Reconciliation Commission Report</option>
                <option value="apartheid_law">Historical Apartheid-Era Law</option>
              </optgroup>
              <optgroup label="Administrative Documents">
                <option value="gazette_notice">Government Gazette Notice</option>
                <option value="ministerial_directive">Ministerial Directive</option>
                <option value="circular">Departmental Circular</option>
                <option value="tender_notice">Tender or Procurement Document</option>
                <option value="presidential_proclamation">Presidential Proclamation</option>
                <option value="executive_order">Executive Instruction/Order</option>
              </optgroup>
            </select>
          )}
          <button onClick={handleApplyFilter}>Apply</button>
          <button onClick={handleClearFilter}>Clear</button>
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

function ContentsDisplay({ contents, loading, showSearch, movingItem, navigateToFolder, handleFileDoubleClick, handleContextMenu, contextMenu, filterCriteria }) {
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
                  onDoubleClick={() => !item.is_folder && showSearch && handleFileDoubleClick(item)}
                  aria-label={item.is_folder ? `Open folder ${item.name}` : `View file ${item.name}`}
                >
                  {item.is_folder ? '📁' : '📄'} 
                  {item.metadata?.displayName || item.name}
                  {!item.is_folder && <mark className="file-type">{item.metadata?.file_type}</mark>}
                  {showSearch && !item.is_folder && item.parentFolder && (
                    <small className="file-location"> (in {item.parentFolder.name})</small>
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

  if (showSearch) {
    return (
      <article className="no-search-results">
        <p className="empty-icon" aria-hidden="true">🔍</p>
        <h2 className="empty-text">No Results Match Your Search</h2>
      </article>
    );
  }

  if (filterCriteria) {
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