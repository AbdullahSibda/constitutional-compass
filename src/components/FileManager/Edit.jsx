import { useState, useEffect } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import './Edit.css';

  export default function Edit({ item, onEditSuccess, onCancel }) {
    useAuth();
    const [folderName, setFolderName] = useState(item.name || '');
    const [metadata, setMetadata] = useState({
      displayName: '',
      description: '',
      year: '',
      author: ''
    }); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [touched, setTouched] = useState({
      name: false,
      displayName: false,
      description: false
    });
    const [existingNames, setExistingNames] = useState([]);
  
    useEffect(() => {
      if (!item.is_folder) {
        setMetadata({
          displayName: item.metadata?.displayName || item.name,
          description: item.metadata?.description || '',
          year: item.metadata?.year || '',
          author: item.metadata?.author || ''
        });
      }  
      
      const fetchExistingNames = async () => {
        const { data, error } = await supabase
          .from('documents')
          .select('name, metadata')
          .eq('parent_id', item.parent_id)
          .neq('id', item.id);
        
        if (!error && data) {
          const names = data.map(item => {
            return item.is_folder 
              ? item.name.toLowerCase()
              : (item.metadata?.displayName || item.name).toLowerCase();
          });
          setExistingNames(names);
        }
      };

      fetchExistingNames();
    }, [item]);
  

    useEffect(() => {
      const handleKeyDown = (e) => e.key === 'Escape' && onCancel();
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);
  
    useEffect(() => {
      if (success) {
        const timer = setTimeout(onEditSuccess, 2000);
        return () => clearTimeout(timer);
      }
    }, [success, onEditSuccess]);
  
    const handleNameChange = (e) => setFolderName(e.target.value);
    
    const handleMetadataChange = (e) => {
      const { name, value } = e.target;
      setMetadata(prev => ({ ...prev, [name]: value }));
    };
    const handleBlur = (e) => {
      const { name } = e.target;
      setTouched(prev => ({ ...prev, [name]: true }));
    };
  
    const validateForm = () => {
      if (item.is_folder) {
        setTouched({ ...touched, folderName: true });
        if (!folderName.trim()) {
          setError('Folder name is required');
          return false;
        }
        if (folderName.toLowerCase() !== item.name.toLowerCase() && 
        existingNames.includes(folderName.toLowerCase())) {
          setError('A folder with this name already exists');
          return false;
        }
      } else {
        setTouched({ displayName: true, documentType: true });
        if (!metadata.displayName.trim()) {
          setError('Display name is required');
          return false;
        }
        if (!metadata.description) {
          setError('Description is required');
          return false;
        }
        const currentDisplayName = item.metadata?.displayName || item.name;
        if (metadata.displayName.toLowerCase() !== currentDisplayName.toLowerCase() && 
        existingNames.includes(metadata.displayName.toLowerCase())) {
          setError('A document with this name already exists');
          return false;
        }
      }
      return true;
    };
  
    const updateFolder = async () => {
      const { error: dbError } = await supabase
        .from('documents')
        .update({ name: folderName })
        .eq('id', item.id);
      if (dbError) throw dbError;
    };
  
    const updateDocument = async () => {
      const fileExtension = item.name.split('.').pop();
      const newFileName = `${metadata.displayName}.${fileExtension}`;
      const updatedMetadata = {
        ...item.metadata,
        displayName: metadata.displayName,
        description: metadata.description,
        year: metadata.year || null,
        author: metadata.author || null
      };
  
      const { error: dbError } = await supabase
        .from('documents')
        .update({
          name: newFileName,
          metadata: updatedMetadata
        })
        .eq('id', item.id);
  
      if (dbError) throw dbError;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;
  
      setLoading(true);
      setError(null);
      setSuccess(false);
  
      try {
        if (item.is_folder) {
          await updateFolder();
        } else {
          await updateDocument();
        }
        setSuccess(true);
      } catch (err) {
        console.error('Edit error:', err);
        setError(err.message || 'Failed to update');
      } finally {
        setLoading(false);
      }
    };
  
    const renderFolderForm = () => (
      <>
        <legend>Folder Properties</legend>
        <section className="form-group">
          <label htmlFor="folderName">Folder Name *</label>
          <input
            type="text"
            id="folderName"
            name="folderName"
            value={folderName}
            onChange={handleNameChange}
            onBlur={handleBlur}
            placeholder="Folder name"
            required
            aria-invalid={touched.folderName && (!folderName.trim() || 
              (folderName.toLowerCase() !== item.name.toLowerCase() && 
               existingNames.includes(folderName.toLowerCase())))}
            aria-describedby={
              touched.folderName && (!folderName.trim() || 
                (folderName.toLowerCase() !== item.name.toLowerCase() && 
                 existingNames.includes(folderName.toLowerCase()))) 
                ? "folderName-error" 
                : undefined
            }
          />
          {touched.folderName && !folderName.trim() && (
            <p id="folderName-error" className="error-text">Folder name is required</p>
          )}
          {touched.folderName && folderName.trim() && 
          folderName.toLowerCase() !== item.name.toLowerCase() && 
          existingNames.includes(folderName.toLowerCase()) && (
            <p id="folderName-error" className="error-text">A folder with this name already exists</p>
          )}
        </section>
      </>
    );
  
    const renderDocumentForm = () => (
      <>
        <legend>Document Metadata</legend>
        <section className="form-group">
          <label htmlFor="displayName">Display Name *</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={metadata.displayName}
            onChange={handleMetadataChange}
            onBlur={handleBlur}
            placeholder="Friendly name for display"
            required
            aria-invalid={
              touched.displayName && 
              (!metadata.displayName.trim() || 
               (metadata.displayName.toLowerCase() !== (item.metadata?.displayName || item.name).toLowerCase() && 
                existingNames.includes(metadata.displayName.toLowerCase())))
            }
            aria-describedby={
              touched.displayName && 
              (!metadata.displayName.trim() || 
               (metadata.displayName.toLowerCase() !== (item.metadata?.displayName || item.name).toLowerCase() && 
                existingNames.includes(metadata.displayName.toLowerCase())))
                ? "displayName-error" 
                : undefined
            }
          />
          {touched.displayName && !metadata.displayName.trim() && (
            <p id="displayName-error" className="error-text">Display name is required</p>
          )}
          {touched.displayName && metadata.displayName.trim() && 
            metadata.displayName.toLowerCase() !== (item.metadata?.displayName || item.name).toLowerCase() && 
            existingNames.includes(metadata.displayName.toLowerCase()) && (
              <p id="displayName-error" className="error-text">A document with this name already exists</p>
            )}
        </section>
  
        <section className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={metadata.description}
            onChange={handleMetadataChange}
            onBlur={handleBlur}
            placeholder="Provide a detailed description of the document..."
            required
            rows={4}
            aria-invalid={touched.description && !metadata.description.trim()}
            aria-describedby={touched.description && !metadata.description.trim() ? "description-error" : undefined}
          />
          {touched.description && !metadata.description.trim() && (
            <p id="description-error" className="error-text">Description is required</p>
          )}
        </section>
        
        <section className="form-group">
          <label htmlFor="year">Year</label>
          <input
            type="number"
            id="year"
            name="year"
            value={metadata.year}
            onChange={handleMetadataChange}
            onBlur={handleBlur}
            min="1900"
            max={new Date().getFullYear()}
            placeholder="e.g. 2023"
          />
        </section>
  
        <section className="form-group">
          <label htmlFor="author">Author</label>
          <input
            type="text"
            id="author"
            name="author"
            value={metadata.author}
            onChange={handleMetadataChange}
            onBlur={handleBlur}
            placeholder="e.g. Judge Smith"
          />
        </section>
      </>
    );
  
    return (
      <dialog
        className="edit-overlay"
        open
        onClick={onCancel}
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        <section
          className="edit-container"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <h2 id="edit-modal-title">Edit {item.is_folder ? 'Folder' : 'Metadata'}</h2>
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <form onSubmit={handleSubmit} className="edit-form" noValidate role="form">
            <fieldset className="metadata-fields" disabled={loading}>
              {item.is_folder ? renderFolderForm() : renderDocumentForm()}
            </fieldset>
  
            {loading && (
              <>
                <style>{`
                  .edit-overlay[aria-busy="true"]::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 1;
                  }
                `}</style>
                <progress className="spinner" aria-label="Saving changes" />
                <p hidden>Saving changes...</p>
              </>
            )}
  
            <menu className="edit-actions">
              <li>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </li>
            </menu>
  
            {error && (
              <article className="error-message" role="alert">
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="dismiss-button"
                  aria-label="Dismiss error message"
                >
                  ×
                </button>
              </article>
            )}
  
            {success && (
              <output className="success-message">
                ✓ {item.is_folder ? 'Folder' : 'Metadata'} updated successfully!
              </output>
            )}
          </form>
        </section>
      </dialog>
    );
  }