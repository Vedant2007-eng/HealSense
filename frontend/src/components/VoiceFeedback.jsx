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
  
  // Store 4 audio blobs/files, 4 transcripts, and 4 audio URLs
  const [recordedBlobs, setRecordedBlobs] = useState([null, null, null, null]);
  const [audioUrls, setAudioUrls] = useState(['', '', '', '']);
  const [transcripts, setTranscripts] = useState(['', '', '', '']);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    speakQuestion(QUESTIONS[currentQuestion]);
    return () => {
      synthRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion]);

  const speakQuestion = (text) => {
    if (!synthRef.current) return;
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
    synthRef.current?.cancel();
    setIsSpeaking(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Store audio blob and preview URL for current question
        const newBlobs = [...recordedBlobs];
        newBlobs[currentQuestion] = blob;
        setRecordedBlobs(newBlobs);

        const newUrls = [...audioUrls];
        newUrls[currentQuestion] = url;
        setAudioUrls(newUrls);

        stream.getTracks().forEach(t => t.stop());
        
        // Optional instant transcription preview for user feedback
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append('file', blob, `q${currentQuestion + 1}.webm`);
        
        try {
          const res = await axios.post(`${API_URL}/transcribe`, formData);
          const newTranscripts = [...transcripts];
          newTranscripts[currentQuestion] = res.data.transcript || "(Audio recorded)";
          setTranscripts(newTranscripts);
        } catch {
          const newTranscripts = [...transcripts];
          newTranscripts[currentQuestion] = "(Audio recorded successfully)";
          setTranscripts(newTranscripts);
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
      setError("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleReRecord = () => {
    const newBlobs = [...recordedBlobs];
    newBlobs[currentQuestion] = null;
    setRecordedBlobs(newBlobs);

    const newUrls = [...audioUrls];
    newUrls[currentQuestion] = '';
    setAudioUrls(newUrls);

    const newTranscripts = [...transcripts];
    newTranscripts[currentQuestion] = '';
    setTranscripts(newTranscripts);

    setError("");
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitAll = () => {
    // Check if at least 1 audio file is recorded
    const hasAnyAudio = recordedBlobs.some(b => b !== null);
    if (!hasAnyAudio) {
      setError("Please record at least one audio answer before submitting.");
      return;
    }

    // Pass the 4 recorded audio blobs to ProcessingScreen
    navigate('/processing', {
      state: {
        recordedBlobs: recordedBlobs,
        language: language,
        questions: QUESTIONS
      }
    });
  };

  const isCurrentRecorded = !!recordedBlobs[currentQuestion];
  const completedCount = recordedBlobs.filter(b => b !== null).length;

  return (
    <div className="container" style={{ maxWidth: '750px', margin: '0 auto', padding: '20px 15px' }}>
      {/* Title & Language selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1a73e8' }}>🎙️ Voice Survey Mode</h1>
          <p style={{ margin: '4px 0 0 0', color: '#5f6368', fontSize: '0.95rem' }}>
            Record audio answers question by question (1 to 4)
          </p>
        </div>

        <div style={{ background: '#f8f9fa', padding: '6px 14px', borderRadius: '8px', border: '1px solid #dadce0' }}>
          <label style={{ fontSize: '0.9rem', marginRight: '8px', fontWeight: '500' }}>🌐 Language: </label>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
          >
            <option value="en-US">English</option>
            <option value="es-ES">Español</option>
            <option value="hi-IN">Hindi</option>
          </select>
        </div>
      </div>

      {/* Step Indicators / Progress bar */}
      <div style={{ marginBottom: '25px', background: '#fff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#202124' }}>
            Step {currentQuestion + 1} of {QUESTIONS.length}
          </span>
          <span style={{ fontSize: '0.9rem', color: '#188038', fontWeight: 'bold' }}>
            {completedCount}/{QUESTIONS.length} Audio Answers Captured
          </span>
        </div>

        {/* Interactive Step Circles */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {QUESTIONS.map((_, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              style={{
                flex: 1,
                padding: '10px 5px',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                background: idx === currentQuestion 
                  ? '#e8f0fe' 
                  : recordedBlobs[idx] 
                    ? '#e6f4ea' 
                    : '#f1f3f4',
                color: idx === currentQuestion 
                  ? '#1a73e8' 
                  : recordedBlobs[idx] 
                    ? '#137333' 
                    : '#5f6368',
                border: idx === currentQuestion ? '2px solid #1a73e8' : recordedBlobs[idx] ? '2px solid #34a853' : '1px solid #dadce0'
              }}
            >
              {recordedBlobs[idx] ? '✅ Q' : '⏺️ Q'}{idx + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="upload-card" style={{ padding: '30px', borderRadius: '16px', border: '1px solid #e0e0e0', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Question {currentQuestion + 1}
          </span>

          <button 
            onClick={() => speakQuestion(QUESTIONS[currentQuestion])} 
            disabled={isSpeaking}
            style={{ background: isSpeaking ? '#e8f0fe' : '#f1f3f4', color: '#1a73e8', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}
          >
            {isSpeaking ? '🔊 Speaking Question...' : '🔊 Hear Question'}
          </button>
        </div>

        <h2 style={{ fontSize: '1.35rem', color: '#202124', lineHeight: '1.5', margin: '15px 0 25px 0', minHeight: '65px' }}>
          "{QUESTIONS[currentQuestion]}"
        </h2>

        {error && (
          <div style={{ background: '#fce8e6', color: '#d93025', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.95rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Audio Recording Controls */}
        <div style={{ textAlign: 'center', margin: '20px 0 30px 0' }}>
          {isTranscribing ? (
            <div style={{ padding: '20px', color: '#1a73e8', fontWeight: 'bold', fontSize: '1.1rem' }}>
              ⏳ Processing audio recording...
            </div>
          ) : !isRecording ? (
            !isCurrentRecorded ? (
              <button 
                onClick={startRecording} 
                disabled={isSpeaking}
                style={{ 
                  background: 'linear-gradient(135deg, #d93025 0%, #b31412 100%)', 
                  color: 'white', 
                  padding: '16px 36px', 
                  fontSize: '1.15rem', 
                  borderRadius: '35px', 
                  border: 'none', 
                  cursor: isSpeaking ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 48, 37, 0.3)',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                🎤 Record Audio Answer (Q{currentQuestion + 1})
              </button>
            ) : (
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #ceebe1' }}>
                <div style={{ color: '#137333', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px' }}>
                  ✅ Question {currentQuestion + 1} Audio Recorded!
                </div>
                
                {/* Audio playback controls */}
                {audioUrls[currentQuestion] && (
                  <audio controls src={audioUrls[currentQuestion]} style={{ width: '100%', maxWidth: '450px', marginBottom: '15px' }} />
                )}

                {transcripts[currentQuestion] && (
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'left', margin: '0 auto 15px auto', maxWidth: '500px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>Transcribed Preview:</div>
                    <div style={{ fontSize: '0.95rem', color: '#202124', marginTop: '4px' }}>"{transcripts[currentQuestion]}"</div>
                  </div>
                )}

                <button 
                  onClick={handleReRecord}
                  style={{ background: '#ffffff', color: '#d93025', border: '1.5px solid #d93025', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: '500' }}
                >
                  🔄 Re-record Answer
                </button>
              </div>
            )
          ) : (
            <div style={{ background: '#fce8e6', padding: '25px', borderRadius: '15px', border: '2px dashed #d93025', display: 'inline-block' }}>
              <div style={{ color: '#d93025', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px', animation: 'pulse 1.5s infinite' }}>
                🔴 Recording Live Answer... ({recordingTime}s)
              </div>
              <button 
                onClick={stopRecording} 
                style={{ background: '#d93025', color: 'white', padding: '12px 28px', fontSize: '1.05rem', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ⏹️ Stop & Save Recording
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #eeeeee' }}>
          <button 
            onClick={handlePrev} 
            disabled={currentQuestion === 0}
            style={{ 
              background: '#f1f3f4', 
              color: currentQuestion === 0 ? '#b0b0b0' : '#3c4043', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500' 
            }}
          >
            ⬅️ Previous Question
          </button>

          {currentQuestion < QUESTIONS.length - 1 ? (
            <button 
              onClick={handleNext}
              style={{ 
                background: '#1a73e8', 
                color: 'white', 
                border: 'none', 
                padding: '10px 24px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Next Question ➡️
            </button>
          ) : (
            <button 
              onClick={handleSubmitAll}
              disabled={completedCount === 0}
              style={{ 
                background: completedCount > 0 ? '#188038' : '#ccc', 
                color: 'white', 
                border: 'none', 
                padding: '12px 28px', 
                borderRadius: '8px', 
                cursor: completedCount > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: '1rem',
                boxShadow: completedCount > 0 ? '0 4px 10px rgba(24, 128, 56, 0.3)' : 'none'
              }}
            >
              🚀 Submit All 4 Audio Answers & Generate Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

