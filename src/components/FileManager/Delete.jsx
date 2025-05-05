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