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
  const [selectedCategory, setSelectedCategory] = useState("");

  const documentOptions = {
    constitutional: [
      { value: "constitution_1996", label: "Constitution of South Africa (1996)" },
      { value: "interim_constitution", label: "Interim Constitution (1993)" },
      { value: "constitutional_amendment", label: "Constitutional Amendment" },
      { value: "bill_of_rights", label: "Bill of Rights" },
      { value: "founding_principles", label: "Founding Principles Document" },
    ],
    legislation: [
      { value: "act_of_parliament", label: "Act of Parliament" },
      { value: "regulation", label: "Government Regulation" },
      { value: "bylaw", label: "Municipal By-law" },
      { value: "white_paper", label: "White Paper" },
      { value: "green_paper", label: "Green Paper" },
      { value: "policy_document", label: "Policy Document" },
    ],
    judicial: [
      { value: "constitutional_court", label: "Constitutional Court Ruling" },
      { value: "supreme_court_appeal", label: "Supreme Court of Appeal Decision" },
      { value: "high_court", label: "High Court Decision" },
      { value: "magistrate_ruling", label: "Magistrate Court Ruling" },
      { value: "legal_opinion", label: "Legal Opinion" },
    ],
    human_rights: [
      { value: "south_african_hr_commission", label: "SA Human Rights Commission Report" },
      { value: "udhr", label: "Universal Declaration of Human Rights" },
      { value: "african_charter", label: "African Charter on Human and Peoples' Rights" },
      { value: "iccpr", label: "ICCPR Document" },
      { value: "icescr", label: "ICESCR Document" },
      { value: "cedaw", label: "CEDAW Document" },
      { value: "crc", label: "Convention on the Rights of the Child" },
    ],
    historical: [
      { value: "freedom_charter", label: "Freedom Charter (1955)" },
      { value: "rivieraconference", label: "Rivonia Trial Documents" },
      { value: "codesa_documents", label: "CODESA Negotiation Records" },
      { value: "truth_reconciliation", label: "Truth & Reconciliation Commission Report" },
      { value: "apartheid_law", label: "Historical Apartheid-Era Law" },
    ],
    administrative: [
      { value: "gazette_notice", label: "Government Gazette Notice" },
      { value: "ministerial_directive", label: "Ministerial Directive" },
      { value: "circular", label: "Departmental Circular" },
      { value: "tender_notice", label: "Tender or Procurement Document" },
      {value: "presidential_proclamation",label: "Presidential Proclamation" },
      { value: "executive_order", label: "Executive Instruction/Order" },
    ],
  };

  const [metadata, setMetadata] = useState({
    displayName: "",
    documentType: "",
    year: "",
    author: "",
  });

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setMetadata((prev) => ({ ...prev, documentType: "" })); // Reset document type
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !user || disabled) return;

    if (!metadata.documentType) {
      setError("Please specify the document type");
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

    if (error) return;

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

      if (uploadError) throw uploadError;

      const { data: doc, error: dbError } = await supabase
        .from("documents")
        .insert({
          name: file.name,
          parent_id:
            parentId === "00000000-0000-0000-0000-000000000000"
              ? null
              : parentId,
          path: "",
          is_folder: false,
          storage_path: filePath,
          mime_type: file.type,
          size: file.size,
          metadata: {
            displayName: metadata.displayName,
            type: metadata.documentType,
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

      if (dbError) throw dbError;
      const documentId = doc.id;
      console.log("hitting processResponse");

      const processRespnse = await fetch(
        "http://localhost:4000/api/process-document",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId, // from your supabase insert
            storagePath: filePath,
            mimeType: file.type, // so the backend knows how to extract text
          }),
        }
      );

      if (!processRespnse.ok) {
        const errorText = await processRespnse.text();
        setError(`Processing failed: ${errorText}`);
        return;
      }

      setSuccess(true);
      setFile(null);
      setMetadata({
        displayName: "",
        documentType: "",
        year: "",
        author: "",
      });

      if (onUploadSuccess) await onUploadSuccess();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");

      if (filePath) {
        try {
          await supabase.storage.from("documents").remove([filePath]);
        } catch (cleanupErr) {
          console.error("Cleanup failed:", cleanupErr);
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
        onSubmit={handleUpload}
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
              setFile(newFile || null);
              
              if (newFile) {
                // Check for duplicates
                const { data: existingFiles } = await supabase
                  .from('documents')
                  .select('name')
                  .eq('name', newFile.name);

                if (existingFiles?.length > 0) {
                  setError(`"${newFile.name}" already exists in the system`);
                } else {
                  setError(null); // Clear error if no duplicate found
                }

                // Always set display name (don't clear it for duplicates)
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
              disabled={loading}
            />
          </section>
          <section className="form-group">
            <label htmlFor="categorySelect">Document Category *</label>
            <select
              id="categorySelect"
              name="categorySelect"
              value={selectedCategory}
              onChange={handleCategoryChange}
              required
              disabled={loading}
            >
              <option value="">Select a category...</option>
              <option value="constitutional">
                Constitutional & Foundational
              </option>
              <option value="legislation">Legislation & Policy</option>
              <option value="judicial">Judicial Decisions</option>
              <option value="human_rights">Human Rights & International</option>
              <option value="historical">
                Historical & Liberation Documents
              </option>
              <option value="administrative">Government Notices & Admin</option>
            </select>

            <label htmlFor="documentType">Document Type *</label>
            <select
              id="documentType"
              name="documentType"
              value={metadata.documentType}
              onChange={handleMetadataChange}
              required
              disabled={loading || !selectedCategory}
            >
              <option value="">Select document type...</option>
              {documentOptions[selectedCategory]?.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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

        <button
          type="submit"
          disabled={!file || loading || disabled || !metadata.documentType}
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
