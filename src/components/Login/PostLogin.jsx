import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostLogin.css";
import { supabase } from '../../contexts/client';

const PostLogin = () => {
  const navigate = useNavigate();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUserContinue = () => {
    navigate("/");
  };

  const handleApplyClick = () => {
    setShowReasonInput(true);
  };

  const handleReasonChange = (e) => {
    setReason(e.target.value);
  };

  const submitApplication = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for your application");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          role: 'pending',
          admin_application_reason: reason,
          applied_at: new Date().toISOString()
        });

      if (error) throw error;

      alert("Application submitted successfully! You'll be notified once approved.");
      navigate("/");
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelApplication = () => {
    setShowReasonInput(false);
    setReason("");
  };

  return (
    <main className="postlogin-container">
      <article className="postlogin-popup">
        <header>
          <h1 className="postlogin-title">Constitutional Compass</h1>
          <p className="postlogin-subtext">
            You're currently logged in as a standard user
          </p>
        </header>

        {!showReasonInput ? (
          <menu className="postlogin-buttons">
            <li>
              <button className="continue-button" onClick={handleUserContinue}>
                Continue as User
              </button>
            </li>
            <li>
              <button className="apply-button" onClick={handleApplyClick}>
                Apply To Be An Admin
              </button>
            </li>
          </menu>
        ) : (
          <form className="application-form" onSubmit={(e) => {
            e.preventDefault();
            submitApplication();
          }}>
            <label htmlFor="admin-reason" className="visually-hidden">
              Explain why you should be an admin
            </label>
            <textarea
              id="admin-reason"
              className="reason-input"
              placeholder="Explain why you should be an admin..."
              value={reason}
              onChange={handleReasonChange}
              rows={5}
              required
            />
            <menu className="form-buttons">
              <li>
                <button 
                  type="submit"
                  className="submit-button" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  className="cancel-button" 
                  onClick={cancelApplication}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </li>
            </menu>
          </form>
        )}
      </article>
    </main>
  );
};

export default PostLogin;