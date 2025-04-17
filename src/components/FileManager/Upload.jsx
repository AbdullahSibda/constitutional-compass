import { useState } from 'react';
import { supabase } from '../../contexts/client';
import { useAuth } from '../../contexts/AuthContext';
import './Upload.css';

export default function Upload({ 
  parentId = '00000000-0000-0000-0000-000000000000',
  onUploadSuccess,
  disabled 
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const [metadata, setMetadata] = useState({
    documentType: '',
    year: '',
    author: ''
  });

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !user || disabled) return;

    if (!metadata.documentType) {
      setError('Please specify the document type');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    let filePath = '';

    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${user.id.slice(0, 8)}-${Date.now()}.${fileExt}`;
      filePath = `${user.id}/${parentId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
          onProgress: ({ loaded, total }) => {
            setProgress(Math.round((loaded / total) * 100));
          }
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          parent_id: parentId === '00000000-0000-0000-0000-000000000000' ? null : parentId,
          path: '',
          is_folder: false,
          storage_path: filePath,
          mime_type: file.type,
          size: file.size,
          metadata: {
            type: metadata.documentType,
            year: metadata.year || null,
            file_type: fileExt,
            original_name: file.name,
            author: metadata.author || null,
            uploaded_by: user.email
          },
          created_by: user.id
        });

      if (dbError) throw dbError;

      setSuccess(true);
      setFile(null);
      setMetadata({
        documentType: '',
        year: '',
        author: ''
      });
      
      if (onUploadSuccess) await onUploadSuccess();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      
      if (filePath) {
        try {
          await supabase.storage.from('documents').remove([filePath]);
        } catch (cleanupErr) {
          console.error('Cleanup failed:', cleanupErr);
        }
      }
      
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="upload-container">
      <h2>Upload Document</h2>
      
      <form onSubmit={handleUpload} className="upload-form">
        <fieldset className="file-selection">
          <legend>File Selection</legend>
          <label htmlFor="file-upload" className="file-upload-label">
            {file ? (
              <figure className="file-preview">
                <figcaption>{file.name}</figcaption>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>{file.name.split('.').pop().toUpperCase()}</p>
              </figure>
            ) : (
              <p className="upload-prompt">
                <strong>+</strong>
                Select File
              </p>
            )}
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
            }}
            className="file-input"
            disabled={disabled || loading}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
          />
        </fieldset>

        <fieldset className="metadata-fields">
          <legend>Document Metadata</legend>
          <section className="form-group">
            <label htmlFor="documentType">Document Type *</label>
            <select
              id="documentType"
              name="documentType"
              value={metadata.documentType}
              onChange={handleMetadataChange}
              required
              disabled={loading}
            >
              <option value="">Select type...</option>
              <option value="constitutional">Constitutional</option>
              <option value="human_rights">Human Rights</option>
              <option value="legislative">Legislative</option>
              <option value="judicial">Judicial</option>
              <option value="executive">Executive</option>
            </select>
          </section>

          <section className="form-group">
            <label htmlFor="year">Year</label>
            <input
              type="number"
              id="year"
              name="year"
              value={metadata.year}
              onChange={handleMetadataChange}
              min="1900"
              max={new Date().getFullYear()}
              placeholder="e.g. 2023"
              disabled={loading}
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
              placeholder="e.g. Judge Smith"
              disabled={loading}
            />
          </section>
        </fieldset>

        {loading && (
          <figure className="progress-container">
            <progress value={progress} max="100" aria-label="Upload progress" />
            <figcaption>{progress}%</figcaption>
          </figure>
        )}

        <button
          type="submit"
          disabled={!file || loading || disabled || !metadata.documentType}
          className="upload-button"
        >
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>

        {error && (
          <article className="error-message" role="alert">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="dismiss-button" aria-label="Dismiss error message">
              ×
            </button>
          </article>
        )}

        {success && (
          <output className="success-message">
          ✓ Document uploaded successfully!
        </output>
        )}
      </form>
    </section>
  );
}