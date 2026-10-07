import { useLocation, Link } from 'react-router-dom';

export default function ReportScreen() {
  const location = useLocation();
  const report = location.state?.report;

  if (!report) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '50px' }}>
        <h2>No report found.</h2>
        <Link to="/">Go Home</Link>
      </div>
    );
  }

  // Assuming JSON structure from prompt
  const getScoreColor = (score) => {
    if (score >= 8) return '#188038';
    if (score >= 5) return '#f9ab00';
    return '#d93025';
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '50px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>AI Feedback Report</h1>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#1a73e8', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          📄 Download PDF
        </button>
      </div>

      <div className="report" style={{ marginTop: '20px' }}>
        <div className="header-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#5f6368' }}>Overall Score</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(report.overall_score) }}>
              {report.overall_score}/10
            </div>
          </div>
          <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#5f6368' }}>Sentiment</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '10px' }}>
              {report.overall_sentiment === 'Positive' ? '😊' : report.overall_sentiment === 'Negative' ? '😞' : '😐'} {report.overall_sentiment}
            </div>
          </div>
        </div>

        <div style={{ background: '#e8f0fe', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>Executive Summary</h3>
          <p style={{ margin: 0, lineHeight: '1.5' }}>{report.overall_summary}</p>
        </div>

        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Detailed Analysis</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ border: '1px solid #dadce0', padding: '15px', borderRadius: '8px' }}>
            <h4>Cleanliness & Facilities</h4>
            <div style={{ fontWeight: 'bold', color: getScoreColor(report.cleanliness?.score) }}>Score: {report.cleanliness?.score}/10</div>
            <p style={{ fontSize: '0.9rem', color: '#5f6368' }}>{report.cleanliness?.summary}</p>
          </div>
          <div style={{ border: '1px solid #dadce0', padding: '15px', borderRadius: '8px' }}>
            <h4>Staff Behaviour</h4>
            <div style={{ fontWeight: 'bold', color: getScoreColor(report.staff_behavior?.score) }}>Score: {report.staff_behavior?.score}/10</div>
            <p style={{ fontSize: '0.9rem', color: '#5f6368' }}>{report.staff_behavior?.summary}</p>
          </div>
          <div style={{ border: '1px solid #dadce0', padding: '15px', borderRadius: '8px' }}>
            <h4>Medicine Timeliness</h4>
            <div style={{ fontWeight: 'bold', color: getScoreColor(report.medicine_timeliness?.score) }}>Score: {report.medicine_timeliness?.score}/10</div>
            <p style={{ fontSize: '0.9rem', color: '#5f6368' }}>{report.medicine_timeliness?.summary}</p>
          </div>
          <div style={{ border: '1px solid #dadce0', padding: '15px', borderRadius: '8px' }}>
            <h4>Doctor & Treatment</h4>
            <div style={{ fontWeight: 'bold', color: getScoreColor(report.doctor_treatment?.score) }}>Score: {report.doctor_treatment?.score}/10</div>
            <p style={{ fontSize: '0.9rem', color: '#5f6368' }}>{report.doctor_treatment?.summary}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#188038' }}>👍 Appreciated Staff</h4>
            {report.appreciated_staff?.length ? (
              <ul style={{ paddingLeft: '20px' }}>
                {report.appreciated_staff.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : <p style={{ color: '#80868b' }}>None mentioned</p>}
          </div>
          <div>
            <h4 style={{ color: '#d93025' }}>👎 Dissatisfied Staff</h4>
            {report.dissatisfied_staff?.length ? (
              <ul style={{ paddingLeft: '20px' }}>
                {report.dissatisfied_staff.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : <p style={{ color: '#80868b' }}>None mentioned</p>}
          </div>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h4 style={{ color: '#d93025' }}>🚨 Complaints & Critical Issues</h4>
          {report.complaints?.length || report.critical_issues?.length ? (
            <ul style={{ paddingLeft: '20px', color: '#d93025' }}>
              {report.complaints?.map((c, i) => <li key={`c-${i}`}>{c}</li>)}
              {report.critical_issues?.map((c, i) => <li key={`ci-${i}`}>{c} (CRITICAL)</li>)}
            </ul>
          ) : <p style={{ color: '#80868b' }}>No complaints recorded.</p>}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#f9ab00' }}>💡 Suggestions</h4>
          {report.suggestions?.length ? (
            <ul style={{ paddingLeft: '20px' }}>
              {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : <p style={{ color: '#80868b' }}>No suggestions provided.</p>}
        </div>
        
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link to="/" style={{ padding: '10px 20px', background: '#f1f3f4', color: '#3c4043', textDecoration: 'none', borderRadius: '4px' }}>
            🏠 Back to Home
          </Link>
          <Link to="/feedback" style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', textDecoration: 'none', borderRadius: '4px', marginLeft: '10px' }}>
            ➕ New Survey
          </Link>
        </div>
      </div>
    </div>
  );
}
