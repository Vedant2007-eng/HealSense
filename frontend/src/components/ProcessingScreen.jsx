import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export default function ProcessingScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [statusMsg, setStatusMsg] = useState("Uploading 4 audio recordings...");

  useEffect(() => {
    const processFeedback = async () => {
      try {
        const { recordedBlobs, answers, language } = location.state || {};
        
        if (recordedBlobs && Array.isArray(recordedBlobs) && recordedBlobs.some(b => b !== null)) {
          setStatusMsg("Transcribing audio files with Whisper & Analyzing Tone...");
          const formData = new FormData();
          
          recordedBlobs.forEach((blob, idx) => {
            if (blob) {
              formData.append('files', blob, `q${idx + 1}_answer.webm`);
            } else {
              // Create empty audio placeholder blob if skipped
              const emptyBlob = new Blob([], { type: 'audio/webm' });
              formData.append('files', emptyBlob, `q${idx + 1}_empty.webm`);
            }
          });
          
          formData.append('language', language || 'en-US');

          setStatusMsg("Generating AI Feedback & Multi-Page Summary Report...");
          const res = await axios.post(`${API_URL}/analyze_survey_audio`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          navigate('/report', { state: { report: res.data } });
        } else if (answers) {
          // Fallback text answers
          const res = await axios.post(`${API_URL}/analyze_survey`, {
            language: language || 'en-US',
            answers
          });
          navigate('/report', { state: { report: res.data } });
        } else {
          navigate('/feedback');
        }
      } catch (err) {
        console.error("Processing failed", err);
        alert("Analysis failed. Please ensure backend is running.");
        navigate('/feedback');
      }
    };

    processFeedback();
  }, [location, navigate]);

  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h1 style={{ color: '#1a73e8', fontSize: '1.8rem', marginBottom: '10px' }}>⚡ Analyzing Your Voice Feedback</h1>
        <p style={{ fontSize: '1.1rem', color: '#5f6368', marginTop: '10px' }}>
          {statusMsg}
        </p>

        <div style={{ margin: '40px auto 20px auto', width: '60px', height: '60px', border: '6px solid #e8f0fe', borderTop: '6px solid #1a73e8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        
        <p style={{ color: '#80868b', fontSize: '0.9rem', marginTop: '20px' }}>
          Converting 4 audio files → Whisper Speech-to-Text → Tone Distress Analysis → AI Executive Summary
        </p>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

