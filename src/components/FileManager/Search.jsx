import { useState } from 'react';
import { supabase } from '../../contexts/client';
import './Search.css';

export default function Search({ 
  currentFolder, 
  onSearchResults, 
  onSearchError,
  onClearSearch
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      onClearSearch();
      return;
    }
  
    setLoading(true);
    try {
      const rootFolderId = '00000000-0000-0000-0000-000000000000';
      const allSubfolderIds = await getAllSubfolderIds(currentFolder);
  
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          parentFolder:parent_id (id, name)
        `)
        .eq('is_folder', false)
        .or(
          `metadata->>displayName.ilike.%${searchQuery}%,` +
          `metadata->>description.ilike.%${searchQuery}%,` +
          `metadata->>file_type.ilike.%${searchQuery}%,` +
          `metadata->>year.ilike.%${searchQuery}%`
        )
        .in('parent_id', currentFolder === rootFolderId 
          ? [rootFolderId, ...allSubfolderIds] 
          : [currentFolder, ...allSubfolderIds]
        );
  
      if (error) throw error;
  
      const transformedData = data.map(item => ({
        ...item,
        parentFolder: item.parentFolder ? { 
          id: item.parentFolder.id, 
          name: item.parentFolder.id === rootFolderId 
            ? 'Constitution Archive' 
            : item.parentFolder.name 
        } : null
      }));
  
      onSearchResults(transformedData);
    } catch (err) {
      onSearchError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getAllSubfolderIds = async (folderId) => {
    const ids = [];
    const queue = [folderId];
    const rootFolderId = '00000000-0000-0000-0000-000000000000';
    
    while (queue.length > 0) {
      const currentId = queue.shift();
      const query = currentId === rootFolderId
        ? supabase.from('documents').select('id').eq('parent_id', rootFolderId).eq('is_folder', true).neq('id', rootFolderId)
        : supabase.from('documents').select('id').eq('parent_id', currentId).eq('is_folder', true);
      
      const { data, error } = await query;
      if (error) throw error;
      
      data.forEach(folder => {
        if (folder.id !== rootFolderId) {
          ids.push(folder.id);
          queue.push(folder.id);
        }
      });
    }
    return ids;
  };

  return (
    <search className="search-container">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search files in this folder..."
        disabled={loading}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      <button
        onClick={() => {
          setSearchQuery('');
          onClearSearch();
        }}
        disabled={loading}
      >
        Clear
      </button>
    </search>
  );
}