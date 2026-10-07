import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const QUESTIONS = [
  "How would you rate the cleanliness of the hospital and the basic facilities provided?",
  "How would you rate the behaviour of the hospital staff and the timeliness of your medicine doses?",
  "How satisfied are you with the treatment given by the doctors and the overall service you received?",
  "Which staff member's service did you appreciate most, and with whose service were you dissatisfied? Please also share any suggestions to improve the hospital?"
];

export default function VoiceFeedback() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Speak the first question on mount
    speakQuestion(QUESTIONS[0]);
    
    return () => {
      synthRef.current.cancel();
      stopRecording();
    };
  }, []);

  const speakQuestion = (text) => {
    synthRef.current.cancel();
    if (!text) return;
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const startRecording = async () => {
    setError("");
    setTranscript("");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append('file', blob, 'feedback.webm');
        
        try {
          const res = await axios.post(`${API_URL}/transcribe`, formData);
          setTranscript(res.data.transcript);
        } catch (err) {
          setError('Failed to transcribe audio. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setError("Microphone access denied. Allow mic permission in your browser.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const handleContinue = async () => {
    const newAnswers = [...answers, {
      question: QUESTIONS[currentQuestion],
      answer: transcript
    }];
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setTranscript("");
      setCurrentQuestion(prev => prev + 1);
      speakQuestion(QUESTIONS[currentQuestion + 1]);
    } else {
      // Submit all
      navigate('/processing', { state: { answers: newAnswers, language } });
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Voice Feedback</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Language: </label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
          <option value="hi-IN">Hindi</option>
        </select>
      </div>

      <div className="upload-card" style={{ padding: '30px' }}>
        <h3 style={{ color: '#5f6368', marginBottom: '10px' }}>Question {currentQuestion + 1} of {QUESTIONS.length}</h3>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', minHeight: '80px' }}>
          {QUESTIONS[currentQuestion]}
        </h2>

        {isSpeaking ? (
          <div style={{ marginBottom: '20px', color: '#1a73e8', fontWeight: 'bold' }}>
            🔊 Speaking...
          </div>
        ) : (
          <button onClick={() => speakQuestion(QUESTIONS[currentQuestion])} style={{ background: '#f1f3f4', color: '#3c4043', border: 'none', padding: '10px 20px', borderRadius: '20px', marginBottom: '20px', cursor: 'pointer' }}>
            🔊 Hear Question Again
          </button>
        )}

        <div style={{ margin: '30px 0' }}>
          {error && <p style={{ color: '#d93025', marginBottom: '15px' }}>{error}</p>}
          
          {isTranscribing ? (
            <div style={{ color: '#1a73e8', fontWeight: 'bold' }}>⏳ Transcribing your answer...</div>
          ) : !isRecording ? (
            <button 
              onClick={startRecording} 
              disabled={isSpeaking}
              style={{ background: '#d93025', color: 'white', padding: '15px 30px', fontSize: '1.2rem', borderRadius: '30px', border: 'none', cursor: isSpeaking ? 'not-allowed' : 'pointer' }}
            >
              🎤 Tap to Speak Answer
            </button>
          ) : (
             <button 
              onClick={stopRecording} 
              style={{ background: '#5f6368', color: 'white', padding: '15px 30px', fontSize: '1.2rem', borderRadius: '30px', border: 'none', cursor: 'pointer' }}
            >
              ⏹️ Stop Recording ({recordingTime}s)
            </button>
          )}
        </div>

        {transcript && !isTranscribing && (
          <div style={{ background: '#e8f0fe', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'left' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>Your answer:</h4>
            <p style={{ fontSize: '1.1rem', margin: 0 }}>"{transcript}"</p>
          </div>
        )}

        {transcript && !isRecording && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px' }}>
            <button 
              onClick={() => { setTranscript(""); setError(""); }} 
              style={{ background: 'white', border: '2px solid #dadce0', padding: '12px 25px', borderRadius: '20px', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              🔄 Re-record
            </button>
            <button 
              onClick={handleContinue} 
              style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 35px', borderRadius: '20px', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              Continue ➡️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
