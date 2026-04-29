import { useState, useCallback, useEffect } from 'react';

let _showToast = null;

export function useToast() {
  const show = useCallback((message, type = 'error', duration = 3000) => {
    if (_showToast) _showToast(message, type, duration);
  }, []);
  return {
    showError: (msg, dur) => show(msg, 'error', dur),
    showSuccess: (msg, dur) => show(msg, 'success', dur),
  };
}

export default function Toast() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    _showToast = (message, type, duration) => {
      if (type === 'error') {
        setError(message);
        setTimeout(() => setError(null), duration);
      } else {
        setSuccess(message);
        setTimeout(() => setSuccess(null), duration);
      }
    };
    return () => { _showToast = null; };
  }, []);

  return (
    <>
      <div className="error-container" style={{ display: error ? 'block' : 'none' }}>
        <div className="error-message">
          <p id="error-message">{error}</p>
        </div>
      </div>
      <div className="success-container" style={{ display: success ? 'block' : 'none' }}>
        <div className="success-message">
          <p id="success-message">{success}</p>
        </div>
      </div>
    </>
  );
}
