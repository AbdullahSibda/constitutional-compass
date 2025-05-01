import { deleteItem, restoreItem } from './Delete';

export default function ContextMenu({ item, onEdit, onDelete, onUndoDelete, onDownload, onMove, onClose, isDeleted }) {
  const handleDelete = async () => {
    try {
      await deleteItem(item);
      onDelete(item.id, true);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      onDelete(err.message);
      onClose();
    }
  };

  const handleUndoDelete = async () => {
    try {
      await restoreItem(item);
      onUndoDelete(item.id, false);
      onClose();
    } catch (err) {
      console.error('Undo delete failed:', err);
      onUndoDelete(err.message);
      onClose();
    }
  };

  return (
    <dialog className="context-menu-overlay" onClick={onClose} open>
      <menu className="context-menu-popup" aria-label="Item actions" onClick={(e) => e.stopPropagation()}>
        <li>
          <button className="context-menu-item" onClick={() => { onEdit(); onClose(); }}>
            Edit Metadata
          </button>
        </li>
        {!item.is_folder && (
          <li>
            <button className="context-menu-item" onClick={() => { onDownload(); onClose(); }}>
              Download
            </button>
          </li>
        )}
        <li>
          <button className="context-menu-item" onClick={() => { onMove(); onClose(); }}>
            Move
          </button>
        </li>
        <li>
          <button className="context-menu-item delete" onClick={isDeleted ? handleUndoDelete : handleDelete}>
            {isDeleted ? 'Undo Delete' : 'Delete'}
          </button>
        </li>
      </menu>
    </dialog>
  );
}