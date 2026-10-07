import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import VoiceFeedback from './components/VoiceFeedback';
import ProcessingScreen from './components/ProcessingScreen';
import ReportScreen from './components/ReportScreen';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ background: '#fff', padding: '15px 30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🏥 HealSense</div>
        <Link to="/" style={{ textDecoration: 'none', color: '#1a73e8' }}>Express Upload</Link>
        <Link to="/feedback" style={{ textDecoration: 'none', color: '#1a73e8' }}>Voice Survey Mode</Link>
      </nav>
      
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feedback" element={<VoiceFeedback />} />
          <Route path="/processing" element={<ProcessingScreen />} />
          <Route path="/report" element={<ReportScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
