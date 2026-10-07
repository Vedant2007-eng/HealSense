import { useState, useRef } from 'react'
import axios from 'axios'
import '../App.css'

const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [file, setFile] = useState(null)
  const [pulse, setPulse] = useState('')
  const [temp, setTemp] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordTime, setRecordTime] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      setError('Microphone access denied. Allow mic permission in your browser.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const handleUpload = async () => {
    const audio = recordedBlob || file
    if (!audio) return
    setLoading(true)
    setError('')
    setResult(null)
    const formData = new FormData()
    formData.append('file', audio, recordedBlob ? 'recording.webm' : file.name)
    if (pulse) formData.append('pulse_bpm', pulse)
    if (temp) formData.append('temp_c', temp)
    try {
      const res = await axios.post(`${API_URL}/analyze`, formData)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const priorityColor = {
    URGENT: '#d93025', HIGH: '#e8710a',
    MEDIUM: '#f9ab00', LOW: '#188038',
  }
  const zoneColor = {
    resting: '#188038', slightly_elevated: '#f9ab00',
    elevated: '#e8710a', high: '#d93025', very_high: '#d93025',
  }

  return (
    <div className="container">
      <h1>🏥 HealSense</h1>
      <p className="subtitle">AI-Powered Patient Feedback Intelligence</p>

      <div className="upload-card">
        <label>🎙️ Record Live Feedback</label>
        <div className="record-row">
          {!recording ? (
            <button className="record-btn" onClick={startRecording} disabled={loading}>
              ⏺️ Start Recording
            </button>
          ) : (
            <button className="record-btn stop" onClick={stopRecording}>
              ⏹️ Stop ({recordTime}s)
            </button>
          )}
          {recordedBlob && !recording && (
            <span className="rec-ok">✅ Recording captured ({recordTime}s)</span>
          )}
        </div>
        {recordedBlob && !recording && (
          <audio src={URL.createObjectURL(recordedBlob)} controls className="preview" />
        )}

        <div className="divider">— or upload a file —</div>

        <label>Audio / Video File</label>
        <input type="file" accept="audio/*,video/*" onChange={e => { setFile(e.target.files[0]); setRecordedBlob(null) }} />

        <label>❤️ Pulse Rate (bpm) — optional</label>
        <input
          type="number" min="40" max="220" placeholder="e.g. 88"
          value={pulse} onChange={e => setPulse(e.target.value)}
          className="pulse-input"
        />

        <label>🌡️ Skin Temperature (°C) — optional</label>
        <input
          type="number" step="0.1" min="20" max="45" placeholder="e.g. 33.5"
          value={temp} onChange={e => setTemp(e.target.value)}
          className="pulse-input"
        />

        <button onClick={handleUpload} disabled={(!file && !recordedBlob) || loading || recording}>
          {loading ? 'Analyzing... (first run ~30s)' : '🔍 Analyze Feedback'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="report">
          <div className="header-row">
            <h2>Intelligence Report</h2>
            <span className="badge" style={{ background: priorityColor[result.final_priority] || '#666' }}>
              {result.final_priority}
            </span>
          </div>

          <p className="transcript">"{result.transcript}"</p>

          <div className="stats">
            <div className="stat">
              <span className="label">Sentiment</span>
              <span className="value">{result.overall_sentiment}</span>
            </div>
            <div className="stat">
              <span className="label">Alert Score</span>
              <span className="value">{result.alert_score}</span>
            </div>
            <div className="stat">
              <span className="label">Language</span>
              <span className="value">{result.language}</span>
            </div>
            <div className="stat">
              <span className="label">Pace</span>
              <span className="value">{result.speaking_pace_wps} w/s</span>
            </div>
            <div className="stat">
              <span className="label">Distress</span>
              <span className="value">{result.tone.distress_score}</span>
            </div>
            <div className="stat">
              <span className="label">Pulse</span>
              <span className="value" style={{ color: zoneColor[result.pulse.pulse_zone] || '#202124' }}>
                {result.pulse.pulse_bpm ? `${result.pulse.pulse_bpm} bpm` : '—'}
              </span>
              <span className="label">{result.pulse.pulse_zone.replace('_', ' ')}</span>
            </div>
            <div className="stat">
              <span className="label">Skin Temp</span>
              <span className="value" style={{
                color:
                  result.temperature.fever ? '#d93025' : '#202124'
              }}>
                {result.temperature.temp_c ? `${result.temperature.temp_c}°C` : '—'}
              </span>
              <span className="label" style={{ color: result.temperature.fever ? '#d93025' : '#5f6368' }}>
                {result.temperature.fever ? '⚠️ FEVER' : result.temperature.temp_state.replace('_', ' ')}
              </span>
            </div>
          </div>

          <h3>🚩 Flagged Topics</h3>
          <div className="tags">
            {result.flagged_topics.length
              ? result.flagged_topics.map(t => <span key={t} className="tag red">{t}</span>)
              : <span className="tag green">none</span>}
          </div>

          <h3>📌 Aspects Mentioned</h3>
          <div className="tags">
            {result.aspects_mentioned.map(a => (
              <span key={a.aspect} className="tag blue">{a.aspect} ({a.relevance})</span>
            ))}
          </div>

          <h3>🎙️ Sentence Analysis</h3>
          {result.sentence_analysis.map((s, i) => (
            <div key={i} className="sentence">
              <span className={s.sentiment === 'POSITIVE' ? 'pos' : 'neg'}>{s.sentiment}</span>
              <span className="s-text">{s.sentence}</span>
              <span className="conf">{Math.round(s.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
