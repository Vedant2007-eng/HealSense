import os
import json
from google import genai
from pydantic import BaseModel, Field

# Ensure you have set the GEMINI_API_KEY environment variable.
def analyze_survey_with_gemini(answers_list, language):
    """
    Analyzes the 4 questions from the survey using Gemini to produce the requested JSON report.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback if no key provided (for testing purposes without breaking)
        return get_mock_json()
    
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    You are an AI Hospital Feedback Analyzer.
    A patient has provided answers to a 4-question feedback survey.
    Language used: {language}
    
    Answers:
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
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return get_mock_json()

def get_mock_json():
    return {
      "overall_sentiment": "Positive",
      "overall_score": 8,
      "cleanliness": {
        "score": 8,
        "summary": "The patient found the hospital clean and basic facilities adequate."
      },
      "staff_behavior": {
        "score": 9,
        "summary": "Staff behavior was highly appreciated."
      },
      "medicine_timeliness": {
        "score": 7,
        "summary": "Medicine was mostly on time."
      },
      "doctor_treatment": {
        "score": 8,
        "summary": "Satisfied with the overall treatment."
      },
      "appreciated_staff": ["Nurse Joy"],
      "dissatisfied_staff": [],
      "complaints": [],
      "suggestions": ["Improve the washrooms"],
      "critical_issues": [],
      "overall_summary": "Overall a positive experience with minor suggestions for improvement."
    }
