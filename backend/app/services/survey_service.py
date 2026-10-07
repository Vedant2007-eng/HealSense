import os
import json
import re
from google import genai
from app.services.nlp_service import analyze_feedback

def analyze_survey_with_gemini(answers_list, language="en-US"):
    """
    Analyzes the 4 questions from the survey using Gemini (or dynamic NLP fallback)
    to produce the requested JSON report.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
            You are an AI Hospital Feedback Analyzer.
            A patient has provided audio answers to a 4-question feedback survey.
            Language used: {language}
            
            Questions and Patient Transcribed Answers:
            {json.dumps(answers_list, indent=2)}
            
            IMPORTANT RULES:
            1. Do not invent names, complaints, scores, or facts that the patient did not mention.
            2. If information is not available, return an empty array or "Not mentioned".
            3. Output MUST be valid JSON matching exactly the requested structure below.
            
            Required JSON Structure:
            {{
              "overall_sentiment": "Positive|Negative|Neutral",
              "overall_score": <number 1-10>,
              "cleanliness": {{ "score": <number 1-10>, "summary": "..." }},
              "staff_behavior": {{ "score": <number 1-10>, "summary": "..." }},
              "medicine_timeliness": {{ "score": <number 1-10>, "summary": "..." }},
              "doctor_treatment": {{ "score": <number 1-10>, "summary": "..." }},
              "appreciated_staff": ["name1", "name2"],
              "dissatisfied_staff": [],
              "complaints": [],
              "suggestions": [],
              "critical_issues": [],
              "overall_summary": "..."
            }}
            """
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            report = json.loads(response.text)
            report["answers_transcription"] = answers_list
            return report
        except Exception as e:
            print(f"Gemini API error: {e}. Falling back to NLP pipeline.")

    # Fallback to dynamic NLP analysis if Gemini API is unavailable
    return build_dynamic_survey_report(answers_list, language)


def build_dynamic_survey_report(answers_list, language="en-US"):
    """
    Smart dynamic fallback parser analyzing patient's actual text responses.
    """
    q1_ans = ""
    q2_ans = ""
    q3_ans = ""
    q4_ans = ""

    for item in answers_list:
        q_text = item.get("question", "").lower()
        ans_text = item.get("answer", "")
        if "cleanliness" in q_text or "facilities" in q_text:
            q1_ans = ans_text
        elif "behaviour" in q_text or "timeliness" in q_text or "medicine" in q_text:
            q2_ans = ans_text
        elif "treatment" in q_text or "doctor" in q_text:
            q3_ans = ans_text
        elif "appreciated" in q_text or "dissatisfied" in q_text or "suggestions" in q_text:
            q4_ans = ans_text

    combined_text = " ".join([item.get("answer", "") for item in answers_list if item.get("answer")])
    if not combined_text.strip():
        combined_text = "No clear response provided."

    nlp_res = analyze_feedback(combined_text)

    # Cleanliness score & summary
    c_score = 8 if "clean" in q1_ans.lower() or "good" in q1_ans.lower() or "hygienic" in q1_ans.lower() else 5
    if "dirty" in q1_ans.lower() or "bad" in q1_ans.lower() or "unclean" in q1_ans.lower() or "smell" in q1_ans.lower():
        c_score = 3
    c_summary = q1_ans if q1_ans else "Cleanliness and basic facilities were noted."

    # Staff behavior score
    s_score = 8 if "good" in q2_ans.lower() or "polite" in q2_ans.lower() or "helpful" in q2_ans.lower() or "caring" in q2_ans.lower() else 6
    if "rude" in q2_ans.lower() or "late" in q2_ans.lower() or "delay" in q2_ans.lower() or "bad" in q2_ans.lower():
        s_score = 4

    # Medicine timeliness score
    m_score = 8 if "on time" in q2_ans.lower() or "timely" in q2_ans.lower() or "good" in q2_ans.lower() else 6
    if "late" in q2_ans.lower() or "delayed" in q2_ans.lower() or "forgot" in q2_ans.lower():
        m_score = 4

    # Doctor treatment score
    d_score = 9 if "satisfied" in q3_ans.lower() or "excellent" in q3_ans.lower() or "good" in q3_ans.lower() or "cured" in q3_ans.lower() else 6
    if "unsatisfied" in q3_ans.lower() or "bad" in q3_ans.lower() or "poor" in q3_ans.lower() or "neglect" in q3_ans.lower():
        d_score = 3

    # Appreciated staff & dissatisfied staff extraction from Q4 or overall text
    appreciated = []
    dissatisfied = []
    complaints = []
    suggestions = []
    critical_issues = []

    # Check names / terms
    names_found = re.findall(r"(?:nurse|doctor|dr\.|staff|sister|wardboy)\s+([a-zA-Z]+)", combined_text, re.IGNORECASE)
    for n in names_found:
        if any(pos in combined_text.lower() for pos in ["good", "thank", "nice", "kind", "helpful", "appreciate"]):
            appreciated.append(n.capitalize())
        else:
            dissatisfied.append(n.capitalize())

    # Check complaints & suggestions keywords
    sentences = re.split(r"[.!?]+", q4_ans) if q4_ans else re.split(r"[.!?]+", combined_text)
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        s_lower = s_clean.lower()
        if any(w in s_lower for w in ["suggest", "should", "please", "improve", "need", "add"]):
            suggestions.append(s_clean)
        elif any(w in s_lower for w in ["bad", "worst", "dirty", "delay", "rude", "overcharge", "problem", "issue", "pain"]):
            complaints.append(s_clean)
            if any(cw in s_lower for cw in ["emergency", "neglect", "wrong medicine", "infection", "critical"]):
                critical_issues.append(s_clean)

    avg_score = round((c_score + s_score + m_score + d_score) / 4.0, 1)
    sentiment_label = "Positive" if nlp_res["overall_sentiment"] == "POSITIVE" else "Negative" if nlp_res["overall_sentiment"] == "NEGATIVE" else "Neutral"

    return {
        "overall_sentiment": sentiment_label,
        "overall_score": avg_score,
        "cleanliness": {
            "score": c_score,
            "summary": c_summary
        },
        "staff_behavior": {
            "score": s_score,
            "summary": q2_ans if q2_ans else "Staff behavior was evaluated."
        },
        "medicine_timeliness": {
            "score": m_score,
            "summary": "Medicine timeliness was evaluated based on patient feedback."
        },
        "doctor_treatment": {
            "score": d_score,
            "summary": q3_ans if q3_ans else "Doctor treatment and overall service recorded."
        },
        "appreciated_staff": list(set(appreciated)) if appreciated else ["Hospital Staff"],
        "dissatisfied_staff": list(set(dissatisfied)),
        "complaints": complaints,
        "suggestions": suggestions if suggestions else ([q4_ans] if q4_ans else []),
        "critical_issues": critical_issues,
        "overall_summary": f"Patient completed the 4-question voice survey with overall rating {avg_score}/10. Transcribed responses show {sentiment_label.lower()} sentiment.",
        "answers_transcription": answers_list,
        "flagged_topics": nlp_res.get("flagged_topics", []),
        "sentence_analysis": nlp_res.get("sentence_analysis", [])
    }

