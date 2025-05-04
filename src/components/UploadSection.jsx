import React, { useState, useCallback } from 'react';

const UploadSection = () => {
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    date: '',
    jurisdiction: '',
    language: '',
    keywords: ''
  });
  const [collectionPath, setCollectionPath] = useState('');
  const [status, setStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one file' });
      return;
    }

    if (!metadata.title || !collectionPath) {
      setStatus({ type: 'error', message: 'Title and collection path are required' });
      return;
    }

    setStatus({ type: 'info', message: 'Uploading documents to archive...' });

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus({ type: 'success', message: `${files.length} document(s) added to ${collectionPath}` });
      setFiles([]);
      setMetadata({
        title: '',
        description: '',
        date: '',
        jurisdiction: '',
        language: '',
        keywords: ''
      });
    } catch (error) {
      setStatus({ type: 'error', message: 'Upload failed: ' + error.message });
    }
  };

  const handleDragEvents = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles([...e.dataTransfer.files]);
    }
  }, []);

  return (
    <article className="archive-section">
      <header>
      <h2>Constitutional Archive Upload</h2>
      </header>
      
      <form onSubmit={handleUpload}>
        <fieldset>
          <legend>Document Upload</legend>
          <section 
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEvents}
            onDragLeave={handleDragEvents}
            onDragOver={handleDragEvents}
            onDrop={handleDrop}
          >
            <label htmlFor="file-upload" className="dropzone-label">
              {files.length > 0 ? (
                <p>
                  <strong>{files.length} file(s) selected:</strong><br />
                  {files.map((file, i) => (
                    <span key={i}>{file.name}<br /></span>
                  ))}
                </p>
              ) : (
                <p>Drag and drop constitutional documents here</p>
              )}
            </label>
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              className="visually-hidden"
              multiple
              accept=".pdf,.docx,.jpg,.png,.tiff"
            />
          </section>
        </fieldset>

        <fieldset>
          <legend>Document Metadata</legend>
          <section className="form-group">
            <label htmlFor="collection-path">Collection Path *</label>
            <input
              id="collection-path"
              type="text"
              value={collectionPath}
              onChange={(e) => setCollectionPath(e.target.value)}
              placeholder="e.g., /national/constitutions/19th-century"
              required
            />
          </section>

          <section className="form-group">
            <label htmlFor="document-title">Title *</label>
            <input
              id="document-title"
              type="text"
              name="title"
              value={metadata.title}
              onChange={handleMetadataChange}
              required
            />
          </section>

          <section className="form-group">
            <label htmlFor="document-description">Description</label>
            <textarea
              id="document-description"
              name="description"
              value={metadata.description}
              onChange={handleMetadataChange}
              rows="3"
            />
          </section>

          <section className="form-row">
            <section className="form-group">
              <label htmlFor="document-date">Date</label>
              <input
                id="document-date"
                type="date"
                name="date"
                value={metadata.date}
                onChange={handleMetadataChange}
              />
            </section>
          </section>

          <section className="form-group">
            <label htmlFor="document-language">Language</label>
            <input
              id="document-language"
              type="text"
              name="language"
              value={metadata.language}
              onChange={handleMetadataChange}
              placeholder="e.g., English, French"
            />
          </section>

          <section className="form-group">
            <label htmlFor="document-jurisdiction">Jurisdiction</label>
            <input
              id="document-jurisdiction"
              type="text"
              name="jurisdiction"
              value={metadata.jurisdiction}
              onChange={handleMetadataChange}
              placeholder="Country/region"
            />
          </section>

          <section className="form-group">
            <label htmlFor="document-keywords">Keywords</label>
            <input
              id="document-keywords"
              type="text"
              name="keywords"
              value={metadata.keywords}
              onChange={handleMetadataChange}
              placeholder="Comma-separated terms"
            />
          </section>
        </fieldset>

        <menu className="form-actions">
          <li>
            <button type="submit" className="button-primary" disabled={files.length === 0}>
              Upload Documents
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setFiles([])}>
              Clear Selection
            </button>
          </li>
        </menu>
      </form>

      {status && (
        <output className={`status-message ${status.type}`}>
          {status.message}
        </output>
      )}
    </article>
  );
};

export default UploadSection;