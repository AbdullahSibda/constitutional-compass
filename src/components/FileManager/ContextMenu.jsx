export default function ContextMenu({ item, onEdit, onDelete, onUndoDelete, onDownload, onMove, onClose, isDeleted }) {
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
          <button className="context-menu-item delete" onClick={() => { isDeleted ? onUndoDelete() : onDelete(); onClose(); }}>
            {isDeleted ? 'Undo Delete' : (item.is_folder ? 'Delete Folder' : 'Delete File')}
          </button>
        </li>
      </menu>
    </dialog>
  );
}