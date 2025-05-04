import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostLogin.css";
import { supabase } from '../../contexts/client';

const PostLogin = () => {
  const navigate = useNavigate();
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [motivationalLetterFile, setMotivationalLetterFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUserContinue = () => navigate("/");
  const handleApplyClick = () => setShowApplicationForm(true);

  const handleFileChange = (setter) => (e) => {
    if (e.target.files?.[0]) setter(e.target.files[0]);
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    
    if (!cvFile || !motivationalLetterFile) {
      alert("Please upload both your CV and motivational letter");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication failed");

      // Upload files to public bucket
      const uploadFile = async (file, path) => {
        const { data, error } = await supabase.storage
          .from('applications')
          .upload(`${path}/${user.id}_${Date.now()}_${file.name}`, file);
        if (error) throw error;
        return data;
      };

      const [cvData, letterData] = await Promise.all([
        uploadFile(cvFile, 'cv'),
        uploadFile(motivationalLetterFile, 'letters')
      ]);

      // Store public URLs
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          role: 'pending',
          admin_application_reason: 'pending',
          cv_url: supabase.storage.from('applications').getPublicUrl(cvData.path).data.publicUrl,
          motivational_letter_url: supabase.storage.from('applications').getPublicUrl(letterData.path).data.publicUrl,
          applied_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      alert("Application submitted successfully!");
      navigate("/");
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelApplication = () => {
    setShowApplicationForm(false);
    setCvFile(null);
    setMotivationalLetterFile(null);
  };

  return (
    <main className="postlogin-container">
      <article className="postlogin-popup">
        <header>
          <h1>Constitutional Compass</h1>
          <p>You're currently logged in as a standard user</p>
        </header>

        {!showApplicationForm ? (
          <section>
            <button onClick={handleUserContinue}>Continue as User</button>
            <button onClick={handleApplyClick}>Apply To Be An Admin</button>
          </section>
        ) : (
          <form onSubmit={submitApplication} aria-label="Admin Application Form">
            <fieldset>
              <legend>Admin Application</legend>
              
              <label>
                Upload your CV (PDF)
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange(setCvFile)}
                  required
                />
                {cvFile && <p>Selected: {cvFile.name}</p>}
              </label>

              <label>
                Upload your Motivational Letter (PDF)
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange(setMotivationalLetterFile)}
                  required
                />
                {motivationalLetterFile && <p>Selected: {motivationalLetterFile.name}</p>}
              </label>

              <menu>
                <li>
                  <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={cancelApplication} disabled={isSubmitting}>
                    Cancel
                  </button>
                </li>
              </menu>
            </fieldset>
          </form>
        )}
      </article>
    </main>
  );
};

export default PostLogin;