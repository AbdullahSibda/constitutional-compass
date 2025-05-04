import React, { useState } from 'react';

const EditSection = () => {
  const [documents, setDocuments] = useState([
    {
      id: 'const-1842',
      title: '1842 Constitutional Draft',
      path: '/national/constitutions/drafts',
      date: '1842-03-15',
      jurisdiction: 'United States',
      language: 'English',
      keywords: 'draft, 19th century'
    }
  ]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState('');

  const handleEdit = (id) => {
    const doc = documents.find(d => d.id === id);
    setEditingId(id);
    setEditForm({ ...doc });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!editForm.title) newErrors.title = 'Title is required';
    if (!editForm.path) newErrors.path = 'Collection path is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setDocuments(documents.map(doc => 
      doc.id === editingId ? { ...editForm } : doc
    ));
    setEditingId(null);
  };

  const promptAction = (id, type) => {
    setEditingId(id);
    setActionType(type);
    setShowConfirm(true);
  };

  const confirmAction = () => {
    if (actionType === 'delete') {
      setDocuments(documents.filter(doc => doc.id !== editingId));
    }
    setShowConfirm(false);
    setEditingId(null);
    setActionType('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <section aria-labelledby="edit-section-title">
    <header>
      <h2 id="edit-section-title">Edit Constitutional Documents</h2>
    </header>
    
    <figure className="table-container">
      <table className="document-table">
        <caption className="visually-hidden">Available Documents for Editing</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Collection</th>
            <th scope="col" className="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td data-label="Title">{doc.title}</td>
              <td data-label="Collection">{doc.path}</td>
              <td data-label="Actions" className="actions-column">
                <menu className="row-actions">
                  <li>
                    <button 
                      onClick={() => handleEdit(doc.id)}
                      aria-label={`Edit ${doc.title}`}
                    >
                      Edit
                    </button>
                  </li>
                  <li>
                    <button 
                      className="button-danger"
                      onClick={() => promptAction(doc.id, 'delete')}
                      aria-label={`Delete ${doc.title}`}
                    >
                      Delete
                    </button>
                  </li>
                </menu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>

    {editingId && (
      <form onSubmit={handleUpdate} className="edit-form">
        <fieldset>
          <legend>
            <h3>Edit Document</h3>
          </legend>
          <section className="form-group">
            <label htmlFor="edit-title">Title *</label>
            <input
              id="edit-title"
              type="text"
              name="title"
              value={editForm.title || ''}
              onChange={handleInputChange}
              required
              aria-required="true"
            />
            {errors.title && (
              <output role="alert" className="error-message">
                {errors.title}
              </output>
            )}
          </section>
          
          <section className="form-group">
            <label htmlFor="edit-path">Collection Path *</label>
            <input
              id="edit-path"
              type="text"
              name="path"
              value={editForm.path || ''}
              onChange={handleInputChange}
              required
              aria-required="true"
            />
            {errors.path && (
              <output role="alert" className="error-message">
                {errors.path}
              </output>
            )}
          </section>
          
          <section className="form-group">
            <label htmlFor="edit-keywords">Keywords</label>
            <input
              id="edit-keywords"
              type="text"
              name="keywords"
              value={editForm.keywords || ''}
              onChange={handleInputChange}
              aria-describedby="keywords-help"
            />
            <small id="keywords-help">Comma-separated terms</small>
          </section>
        </fieldset>
        
        <menu className="form-actions">
          <li>
            <button type="submit" className="button-primary">
              Save Changes
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => setEditingId(null)}
              className="button-secondary"
            >
              Cancel
            </button>
          </li>
        </menu>
      </form>
    )}

    {showConfirm && (
      <dialog open className="confirmation-dialog">
        <article>
          <header>
            <h3>Confirm {actionType === 'delete' ? 'Deletion' : 'Action'}</h3>
          </header>
          <p>
            {actionType === 'delete' 
              ? 'Are you sure you want to delete this document?'
              : 'Confirm this action?'}
          </p>
          <footer>
            <menu className="dialog-actions">
              <li>
                <button 
                  onClick={confirmAction} 
                  className={actionType === 'delete' ? 'button-danger' : 'button-primary'}
                >
                  Confirm
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </li>
            </menu>
          </footer>
        </article>
      </dialog>
    )}
  </section>
);
};

export default EditSection;