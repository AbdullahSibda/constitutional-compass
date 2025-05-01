import { useState } from 'react';
import { supabase } from '../../contexts/client';

export default function Filter({ 
  currentFolder, 
  onFilterResults, 
  onFilterError, 
  onFilterActive,
  renderFilterInput 
}) {
  const [filterCriteria, setFilterCriteria] = useState('');
  const [filterValue, setFilterValue] = useState('');

  const handleApplyFilter = async () => {
    if (!filterCriteria || !filterValue) {
      handleClearFilter();
      return;
    }

    try {
      onFilterActive(true);
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          parentFolder:documents!parent_id(name)
        `)
        .eq('is_folder', false)
        .eq('parent_id', currentFolder);

      if (filterCriteria === 'file_type') {
        query = query.ilike('metadata->>file_type', `%${filterValue}%`);
      } else {
        query = query.eq(`metadata->>${filterCriteria}`, filterValue);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      onFilterResults(data.map(item => ({
        ...item,
        parentFolder: item.parentFolder ? { name: item.parentFolder.name } : null
      })) || []);
    } catch (err) {
      onFilterError('Filter failed: ' + err.message);
    }
  };

  const handleClearFilter = () => {
    setFilterCriteria('');
    setFilterValue('');
    onFilterActive(false); 
  };

  return renderFilterInput({
    filterCriteria,
    setFilterCriteria,
    filterValue,
    setFilterValue,
    handleApplyFilter,
    handleClearFilter,
  });
}