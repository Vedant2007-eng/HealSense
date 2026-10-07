import { useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportScreen() {
  const location = useLocation();
  const report = location.state?.report;
  const reportRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!report) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2>No feedback report found.</h2>
        <p style={{ color: '#5f6368', marginBottom: '20px' }}>Please complete the 4-question voice survey to generate a report.</p>
        <Link to="/feedback" style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
          🎙️ Start Voice Survey
        </Link>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(`HealSense_Patient_Feedback_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to browser print
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getScoreColor = (score) => {
    if (!score) return '#5f6368';
    if (score >= 8) return '#188038';
    if (score >= 5) return '#f9ab00';
    return '#d93025';
  };

  return (
    <div className="container" style={{ maxWidth: '850px', margin: '0 auto', padding: '20px 15px 60px 15px' }}>
      {/* Top Bar with PDF Download Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1a73e8' }}>🏥 HealSense AI Feedback Report</h1>
          <p style={{ margin: '4px 0 0 0', color: '#5f6368', fontSize: '0.95rem' }}>
            Generated on {new Date().toLocaleDateString()} from 4 Audio Survey Answers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleDownloadPdf} 
            disabled={isGeneratingPdf}
            style={{ 
              padding: '10px 22px', 
              background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)', 
              color: 'white', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: isGeneratingPdf ? 'wait' : 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(26, 115, 232, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isGeneratingPdf ? '⏳ Generating PDF...' : '📄 Download PDF Report'}
          </button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div ref={reportRef} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e0e0e0', padding: '35px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        
        {/* Report Header Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1a73e8', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1a73e8', fontSize: '1.5rem' }}>🏥 HealSense Patient Feedback Intelligence</h2>
            <div style={{ fontSize: '0.85rem', color: '#5f6368', marginTop: '3px' }}>Multi-Audio Patient Voice Survey Analysis</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              background: report.overall_sentiment === 'Positive' ? '#e6f4ea' : report.overall_sentiment === 'Negative' ? '#fce8e6' : '#fef7e0', 
              color: report.overall_sentiment === 'Positive' ? '#137333' : report.overall_sentiment === 'Negative' ? '#c5221f' : '#b06000',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'inline-block'
            }}>
              {report.overall_sentiment === 'Positive' ? '😊 Positive' : report.overall_sentiment === 'Negative' ? '😞 Negative' : '😐 Neutral'}
            </span>
          </div>
        </div>

        {/* High Level Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '30px' }}>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e8eaed' }}>
            <div style={{ fontSize: '0.85rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>Overall Rating</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 'bold', color: getScoreColor(report.overall_score), margin: '6px 0' }}>
              {report.overall_score}<span style={{ fontSize: '1.2rem', color: '#80868b' }}>/10</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>Aggregated Patient Satisfaction</div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e8eaed' }}>
            <div style={{ fontSize: '0.85rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>Sentiment Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#202124', margin: '8px 0' }}>
              {report.overall_sentiment}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>Speech & Text Sentiment Analysis</div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e8eaed' }}>
            <div style={{ fontSize: '0.85rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>Audio Files Analyzed</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 'bold', color: '#1a73e8', margin: '6px 0' }}>
              {report.answers_transcription ? report.answers_transcription.length : 4}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>4-Question Voice Survey</div>
          </div>
        </div>

        {/* Executive Summary Block */}
        <div style={{ background: '#e8f0fe', borderLeft: '5px solid #1a73e8', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1a73e8', fontSize: '1.15rem' }}>📋 Executive Summary</h3>
          <p style={{ margin: 0, lineHeight: '1.6', color: '#202124', fontSize: '1rem' }}>
            {report.overall_summary}
          </p>
        </div>

        {/* Question-Wise Audio Answers & Transcripts section */}
        {report.answers_transcription && (
          <div style={{ marginBottom: '35px' }}>
            <h3 style={{ borderBottom: '2px solid #f1f3f4', paddingBottom: '8px', color: '#202124', fontSize: '1.2rem' }}>
              🎙️ Transcribed Patient Audio Answers (Question Wise)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              {report.answers_transcription.map((item, idx) => (
                <div key={idx} style={{ background: '#fafafa', border: '1px solid #e0e0e0', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '0.95rem' }}>
                      Question {idx + 1}:
                    </span>
                    {item.duration_sec ? (
                      <span style={{ fontSize: '0.8rem', color: '#5f6368', background: '#e8eaed', padding: '2px 8px', borderRadius: '10px' }}>
                        ⏱️ {Math.round(item.duration_sec)}s Audio
                      </span>
                    ) : null}
                  </div>

                  <div style={{ fontWeight: '600', color: '#3c4043', fontSize: '0.95rem', marginBottom: '8px' }}>
                    {item.question}
                  </div>

                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px dashed #cccccc', color: '#202124', fontSize: '0.95rem', fontStyle: 'italic' }}>
                    "{item.answer}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown Deep Dive */}
        <div style={{ marginBottom: '35px' }}>
          <h3 style={{ borderBottom: '2px solid #f1f3f4', paddingBottom: '8px', color: '#202124', fontSize: '1.2rem' }}>
            📊 Detailed Category Performance Scores
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginTop: '15px' }}>
            <div style={{ border: '1px solid #dadce0', padding: '18px', borderRadius: '10px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#202124' }}>🧼 Cleanliness & Facilities</h4>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: getScoreColor(report.cleanliness?.score) }}>
                  {report.cleanliness?.score}/10
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#5f6368', marginTop: '8px', marginBottom: 0 }}>
                {report.cleanliness?.summary}
              </p>
            </div>

            <div style={{ border: '1px solid #dadce0', padding: '18px', borderRadius: '10px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#202124' }}>👩‍⚕️ Staff Behaviour</h4>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: getScoreColor(report.staff_behavior?.score) }}>
                  {report.staff_behavior?.score}/10
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#5f6368', marginTop: '8px', marginBottom: 0 }}>
                {report.staff_behavior?.summary}
              </p>
            </div>

            <div style={{ border: '1px solid #dadce0', padding: '18px', borderRadius: '10px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#202124' }}>💊 Medicine Timeliness</h4>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: getScoreColor(report.medicine_timeliness?.score) }}>
                  {report.medicine_timeliness?.score}/10
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#5f6368', marginTop: '8px', marginBottom: 0 }}>
                {report.medicine_timeliness?.summary}
              </p>
            </div>

            <div style={{ border: '1px solid #dadce0', padding: '18px', borderRadius: '10px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#202124' }}>👨‍⚕️ Doctor & Treatment</h4>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: getScoreColor(report.doctor_treatment?.score) }}>
                  {report.doctor_treatment?.score}/10
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#5f6368', marginTop: '8px', marginBottom: 0 }}>
                {report.doctor_treatment?.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Staff Feedback */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#e6f4ea', padding: '20px', borderRadius: '10px', border: '1px solid #ceebe1' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#137333', fontSize: '1.05rem' }}>👍 Appreciated Staff</h4>
            {report.appreciated_staff?.length ? (
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#137333' }}>
                {report.appreciated_staff.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
              </ul>
            ) : <p style={{ color: '#5f6368', margin: 0, fontSize: '0.9rem' }}>No specific staff mentioned.</p>}
          </div>

          <div style={{ background: '#fce8e6', padding: '20px', borderRadius: '10px', border: '1px solid #f5c2c7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#c5221f', fontSize: '1.05rem' }}>👎 Dissatisfied Staff / Areas</h4>
            {report.dissatisfied_staff?.length ? (
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#c5221f' }}>
                {report.dissatisfied_staff.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
              </ul>
            ) : <p style={{ color: '#5f6368', margin: 0, fontSize: '0.9rem' }}>None mentioned.</p>}
          </div>
        </div>

        {/* Complaints & Suggestions */}
        <div style={{ marginBottom: '30px' }}>
          {(report.complaints?.length > 0 || report.critical_issues?.length > 0) && (
            <div style={{ background: '#fce8e6', borderLeft: '5px solid #d93025', padding: '18px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ color: '#d93025', margin: '0 0 10px 0', fontSize: '1.05rem' }}>🚨 Flagged Complaints & Critical Issues</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#d93025' }}>
                {report.critical_issues?.map((c, i) => <li key={`ci-${i}`} style={{ fontWeight: 'bold' }}>⚠️ {c} (CRITICAL)</li>)}
                {report.complaints?.map((c, i) => <li key={`c-${i}`}>{c}</li>)}
              </ul>
            </div>
          )}

          {report.suggestions?.length > 0 && (
            <div style={{ background: '#fef7e0', borderLeft: '5px solid #f9ab00', padding: '18px', borderRadius: '8px' }}>
              <h4 style={{ color: '#b06000', margin: '0 0 10px 0', fontSize: '1.05rem' }}>💡 Patient Suggestions</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#b06000' }}>
                {report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Flagged topics badges if present */}
        {report.flagged_topics && report.flagged_topics.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#5f6368', fontSize: '0.9rem' }}>🚩 NLP FLAGGED TOPICS</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {report.flagged_topics.map((t, idx) => (
                <span key={idx} style={{ background: '#fce8e6', color: '#d93025', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{ marginTop: '35px', textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{ padding: '12px 24px', background: '#f1f3f4', color: '#3c4043', textDecoration: 'none', borderRadius: '8px', fontWeight: '500' }}>
          🏠 Back to Home
        </Link>

        <Link to="/feedback" style={{ padding: '12px 24px', background: '#1a73e8', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          🎙️ New 4-Question Survey
        </Link>

        <button 
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          style={{ padding: '12px 24px', background: '#188038', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          📄 Download PDF
        </button>
      </div>
    </div>
  );
}

