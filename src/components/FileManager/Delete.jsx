import { supabase } from '../../contexts/client';

export default function Delete({ item, onSuccess, onError }) {
  return null;
}

export async function deleteItem(item) {
  try {
    const { error } = await supabase
      .from('documents')
      .update({ is_deleted: true })
      .eq('id', item.id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    throw new Error('Failed to delete item: ' + err.message);
  }
}


export async function permanentlyDeleteItem(item) {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', item.id);

    if (error) throw error;
    return true;
  } catch (err) {
    throw new Error('Failed to permanently delete item: ' + err.message);
  }
}

export async function canReadDocument(item) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', item.id);

  if (error) throw error;
  return data; 
}


export async function restoreItem(item) {
  try {
    const { error } = await supabase
      .from('documents')
      .update({ is_deleted: false })
      .eq('id', item.id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    throw new Error('Failed to restore item: ' + err.message);
  }
}