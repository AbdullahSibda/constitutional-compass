import { useEffect, useRef } from 'react';
import { supabase } from '../../contexts/client';

const FileViewer = ({ file, onClose }) => {
  const onCloseRef = useRef(onClose);
  const hasOpenedRef = useRef(false); // Add this ref to track if we've opened the file

  // Keep the ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!file || hasOpenedRef.current) return; // Check if we've already opened this file
    hasOpenedRef.current = true; // Mark as opened

    const openFileInBrowser = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(file.storage_path);

        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        const newWindow = window.open(url, '_blank');
        
        if (!newWindow || newWindow.closed) {
          throw new Error('Please allow popups to view files');
        }

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onCloseRef.current();
      } catch (err) {
        console.error('Error opening file:', err);
        alert(err.message);
        onCloseRef.current();
      }
    };

    openFileInBrowser();
  }, [file]);

  return null;
};

export default FileViewer;