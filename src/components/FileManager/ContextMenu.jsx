import { useEffect, useState } from 'react';
import { deleteItem, restoreItem, permanentlyDeleteItem } from './Delete';
import { useAuth } from '../../contexts/AuthContext';

export default function ContextMenu({
  item,
  onEdit,
  onDelete,
  onUndoDelete,
  onDownload,
  onMove,
  onClose,
  isDeleted,
  onViewFile
}) {
  const { userRole } = useAuth();
  const [isMod, setIsMod] = useState(false);

  useEffect(() => {
    if (userRole?.toLowerCase() === 'moderator') {
      setIsMod(true);
    }
  }, [userRole]);

  const handleSoftDelete = async () => {
    try {
      await deleteItem(item);
      onDelete(item.id, true);
      onClose();
    } catch (err) {
      console.error('Soft delete failed:', err);
      onDelete(err.message);
      onClose();
    }
  };

const handlePermanentDelete = async () => {
  console.log("Permanently deleting item:", item);
  try {
    await permanentlyDeleteItem(item);
    onDelete(item.id, true);
    onClose();
  } catch (err) {
    console.error("Permanent delete failed:", err);
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

        {!item.is_folder && (
          <li>
            <button className="context-menu-item" onClick={() => { onViewFile(); onClose(); }}>
              View File
            </button>
          </li>
        )}

        {/* Delete Options */}
        {isDeleted ? (
          <li>
            <button className="context-menu-item delete" onClick={handleUndoDelete}>
              Undo Soft Delete
            </button>
          </li>
        ) : (
          <>
            <li>
              <button className="context-menu-item delete" onClick={handleSoftDelete}>
                Soft Delete
              </button>
            </li>
            {isMod && (
              <li>
                <button className="context-menu-item delete permanent" onClick={handlePermanentDelete}>
                  Permanently Delete
                </button>
              </li>
            )}
          </>
        )}
      </menu>
    </dialog>
  );
}
