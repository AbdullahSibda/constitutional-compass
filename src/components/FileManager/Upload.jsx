import { useState } from "react";
import { supabase } from "../../contexts/client";
import { useAuth } from "../../contexts/AuthContext";
import "./Upload.css";

export default function Upload({
  parentId = "00000000-0000-0000-0000-000000000000",
  onUploadSuccess,
  disabled,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const [metadata, setMetadata] = useState({
    displayName: "",
    description: "",
    year: "",
    author: "",
  });

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
      setMetadata((prev) => ({
        ...prev,
        [name]: value,
    }));
  };

  const handleUpload = async (e) => {
  e.preventDefault();
  if (!file || !user || disabled) {
    setError('Missing required fields or form is disabled');
    return;
  }

  if (!metadata.description) {
    setError("Please provide a description of the document");
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    setError("File size exceeds 50MB limit");
    return;
  }

  if (metadata.year && parseInt(metadata.year) > new Date().getFullYear()) {
    setError("Year cannot be in the future");
    return;
  }

  const { data: existingFiles, error: lookupError } = await supabase
    .from('documents')
    .select('name')
    .eq('name', file.name);

  if (lookupError) {
    setError("Couldn't verify file uniqueness");
    return;
  }

  if (existingFiles && existingFiles.length > 0) {
    setError(`A file named "${file.name}" already exists. Please rename your file.`);
    return;
  }

  setLoading(true);
  setError(null);
  setSuccess(false);

  let filePath = "";

  try {
    const fileExt = file.name.split(".").pop().toLowerCase();
    const fileName = `${user.id.slice(0, 8)}-${Date.now()}.${fileExt}`;
    filePath = `${user.id}/${parentId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        parent_id: parentId === "00000000-0000-0000-0000-000000000000" ? null : parentId,
        path: "",
        is_folder: false,
        storage_path: filePath,
        mime_type: file.type,
        size: file.size,
        metadata: {
          description: metadata.description,
          type: 'document',
          year: metadata.year || null,
          file_type: fileExt,
          original_name: file.name,
          author: metadata.author || null,
          uploaded_by: user.email,
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    const documentId = doc.id;

    const processResponse = await fetch(
      "https://constitutional-compass-function-app.azurewebsites.net/api/process-document",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          storagePath: filePath,
          mimeType: file.type,
        }),
      }
    );

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      setError(`Processing failed: ${errorText}`);
      return;
    }

    setSuccess(true);
    setFile(null);
    setMetadata({
      displayName: "",
      description: "",
      year: "",
      author: "",
    });

    if (onUploadSuccess) await onUploadSuccess();

    setTimeout(() => setSuccess(false), 3000);
  } catch (err) {
    console.error('handleUpload: catch error', err);
    setError(err.message || "Upload failed");

    if (filePath) {
      try {
        await supabase.storage.from("documents").remove([filePath]);
      } catch (cleanupErr) {
        console.error('handleUpload: cleanup failed', cleanupErr);
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

      <form
        onSubmit={(e) => {
          console.log('Form submitted');
          handleUpload(e);
        }}
        className="upload-form"
        aria-label="Upload document form"
      >
        <fieldset className="file-selection">
          <legend>File Selection</legend>
          <label htmlFor="file-upload" className="file-upload-label">
            {file ? (
              <figure className="file-preview">
                <figcaption>{file.name}</figcaption>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p>{file.name.split(".").pop().toUpperCase()}</p>
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
            onChange={async (e) => {
              const newFile = e.target.files?.[0];
              console.log('file input onChange:', { newFile });
              setFile(newFile || null);
              
              if (newFile) {
                const { data: existingFiles } = await supabase
                  .from('documents')
                  .select('name')
                  .eq('name', newFile.name);

                  if (existingFiles?.length > 0) {
                    setError(`"${newFile.name}" already exists in the system`);
                  } else {
                    setError(null);
                  }

                  const nameWithoutExt = newFile.name.lastIndexOf('.') > 0
                    ? newFile.name.substring(0, newFile.name.lastIndexOf('.'))
                    : newFile.name;
                  setMetadata(prev => ({ ...prev, displayName: nameWithoutExt }));
              }
            }}
            className="file-input"
            disabled={disabled || loading}
          />
        </fieldset>

        <fieldset className="metadata-fields">
          <legend>Document Metadata</legend>
          <section className="form-group">
            <label htmlFor="displayName">Display Name *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={metadata.displayName}
              onChange={handleMetadataChange}
              placeholder="Friendly name for display"
              required
              disabled={disabled || loading}
            />
          </section>

          <section className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={metadata.description}
              onChange={handleMetadataChange}
              placeholder="Provide a detailed description of the document..."
              required
              rows={4}
              disabled={disabled || loading}
            />
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
              disabled={disabled || loading}
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
              disabled={disabled || loading}
            />
          </section>
        </fieldset>

        <button
          type="submit"
          disabled={!file || loading || disabled || !metadata.description}
          className="upload-button"
        >
          {loading ? "Uploading..." : "Upload Document"}
        </button>

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
            ✓ Document uploaded successfully!
          </output>
        )}
      </form>
    </section>
  );
}