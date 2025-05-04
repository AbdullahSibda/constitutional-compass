import React, { useState } from 'react';

const ManageSection = () => {
  const [documents, setDocuments] = useState([
    {
      id: 'const-1787',
      title: 'U.S. Constitution (Original)',
      status: 'published',
      lastUpdated: '2023-05-15',
      content: 'Full text content of the original U.S. Constitution...'
    },
    {
      id: 'amend-1-10',
      title: 'Bill of Rights',
      status: 'published',
      lastUpdated: '2023-05-18',
      content: 'First ten amendments to the U.S. Constitution...'
    }
  ]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [documentToManage, setDocumentToManage] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleView = (id) => {
    setViewingDocument(documents.find(doc => doc.id === id));
  };

  const handleEdit = (id) => {
    const doc = documents.find(doc => doc.id === id);
    setEditingDocument(id);
    setEditForm({
      title: doc.title,
      status: doc.status,
      content: doc.content
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setDocuments(documents.map(doc => 
      doc.id === editingDocument ? { ...doc, ...editForm } : doc
    ));
    setEditingDocument(null);
  };

  const handleDelete = (id) => {
    setDocumentToManage(id);
    setShowConfirm(true);
  };

  const confirmAction = () => {
    setDocuments(documents.filter(doc => doc.id !== documentToManage));
    setShowConfirm(false);
    setDocumentToManage(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <section aria-labelledby="manage-section-title">
      <h2 id="manage-section-title">Manage Documents</h2>
      
      <table className="document-table">
        <caption>Document Management</caption>
        <thead>
          <tr>
            <th scope="col">Document Title</th>
            <th scope="col">Status</th>
            <th scope="col">Last Updated</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td>{doc.title}</td>
              <td>
                <span className={`status-badge ${doc.status}`}>
                  {doc.status === 'published' ? 'Published' : 'Archived'}
                </span>
              </td>
              <td>{doc.lastUpdated}</td>
              <td>
              <menu className="row-actions">
                  <li>
                    <button 
                      onClick={() => handleView(doc.id)}
                      aria-label={`View ${doc.title}`}
                    >
                      View
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleEdit(doc.id)}
                      aria-label={`Update ${doc.title}`}
                    >
                      Update
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="button-danger"
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

      {viewingDocument && (
        <dialog open className="document-modal">
          <article>
            <header>
              <h3>{viewingDocument.title}</h3>
              <button 
                onClick={() => setViewingDocument(null)}
                aria-label="Close document view"
                className="close-button"
              >
                &times;
              </button>
            </header>
            <section className="document-content">
              <p>{viewingDocument.content}</p>
            </section>
            <footer>
              <p>Last updated: {viewingDocument.lastUpdated}</p>
            </footer>
          </article>
        </dialog>
      )}

      {editingDocument && (
        <dialog open className="edit-modal">
          <article>
            <header>
              <h3>Update Document</h3>
              <button 
                onClick={() => setEditingDocument(null)}
                aria-label="Close edit form"
                className="close-button"
              >
                &times;
              </button>
            </header>
            <form onSubmit={handleUpdate}>
              <fieldset>
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={handleInputChange}
                  required
                />
              </fieldset>
              <fieldset>
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  name="status"
                  value={editForm.status}
                  onChange={handleInputChange}
                >
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </fieldset>
              <fieldset>
                <label htmlFor="edit-content">Content</label>
                <textarea
                  id="edit-content"
                  name="content"
                  value={editForm.content}
                  onChange={handleInputChange}
                  rows="8"
                  required
                />
              </fieldset>
              <menu className="form-actions">
                <li>
                  <button type="submit" className="button-primary">Save Changes</button>
                </li>
                <li>
                  <button type="button" onClick={() => setEditingDocument(null)}>Cancel</button>
                </li>
              </menu>
            </form>
          </article>
        </dialog>
      )}

      {showConfirm && (
        <dialog open className="confirmation-dialog">
          <article>
            <header>
              <h3>Confirm Deletion</h3>
            </header>
            <p>Are you sure you want to delete this document?</p>
            <footer>
              <menu className="dialog-actions">
                <li>
                  <button 
                    onClick={confirmAction} 
                    className="button-danger"
                  >
                    Delete
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowConfirm(false)}>Cancel</button>
                </li>
              </menu>
            </footer>
          </article>
        </dialog>
      )}
    </section>
  );
};

export default ManageSection;