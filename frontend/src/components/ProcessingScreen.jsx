import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export default function ProcessingScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const processFeedback = async () => {
      try {
        const { answers, language } = location.state || {};
        if (!answers) {
          navigate('/');
          return;
        }

        const res = await axios.post(`${API_URL}/analyze_survey`, {
          language,
          answers
        });

        navigate('/report', { state: { report: res.data } });
      } catch (err) {
        console.error("Processing failed", err);
        alert("Analysis failed. Please try again.");
        navigate('/feedback');
      }
    };

    processFeedback();
  }, [location, navigate]);

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h1>Analyzing your feedback...</h1>
      <p style={{ fontSize: '1.2rem', color: '#5f6368', marginTop: '20px' }}>
        Our AI is processing your responses. This will only take a moment.
      </p>
      <div style={{ margin: '50px auto', width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #1a73e8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
