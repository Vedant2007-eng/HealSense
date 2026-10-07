from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from pydub import AudioSegment

from app.services.pipeline_service import process_feedback_audio
from app.services.whisper_service import transcribe_audio
from app.services.tone_service import analyze_tone
from app.services.survey_service import analyze_survey_with_gemini
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="HealSense API", version="1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

DEFAULT_QUESTIONS = [
    "How would you rate the cleanliness of the hospital and the basic facilities provided?",
    "How would you rate the behaviour of the hospital staff and the timeliness of your medicine doses?",
    "How satisfied are you with the treatment given by the doctors and the overall service you received?",
    "Which staff member's service did you appreciate most, and with whose service were you dissatisfied? Please also share any suggestions to improve the hospital?"
]


@app.get("/")
def home():
    return {"message": "HealSense API is running", "docs": "/docs"}

class AnswerItem(BaseModel):
    question: str
    answer: str

class SurveyRequest(BaseModel):
    language: str
    answers: List[AnswerItem]

@app.post("/analyze_survey")
def analyze_survey(payload: SurveyRequest):
    """
    Receives the 4-question voice survey text payload and analyzes it with Gemini / NLP.
    """
    if len(payload.answers) != 4:
        raise HTTPException(status_code=400, detail="Expected exactly 4 answers.")
        
    result = analyze_survey_with_gemini([a.dict() for a in payload.answers], payload.language)
    return result


@app.post("/analyze_survey_audio")
async def analyze_survey_audio(
    files: List[UploadFile] = File(...),
    language: str = Form("en-US")
):
    """
    Receives 4 audio files (one for each question), transcribes each file using Speech-to-Text,
    performs tone analysis, and generates the full survey intelligence report.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No audio files provided.")
    
    answers = []
    temp_files = []

    try:
        for idx, file in enumerate(files):
            question_text = DEFAULT_QUESTIONS[idx] if idx < len(DEFAULT_QUESTIONS) else f"Question {idx+1}"
            
            # Save uploaded audio file temporarily
            file_id = str(uuid.uuid4())[:8]
            ext = os.path.splitext(file.filename)[1] or ".webm"
            save_path = os.path.join(UPLOAD_DIR, f"survey_q{idx+1}_{file_id}{ext}")
            temp_files.append(save_path)

            with open(save_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            # Convert to wav if webm or ogg
            final_path = save_path
            if ext.lower() in (".webm", ".ogg", ".mp4", ".m4a"):
                wav_path = os.path.join(UPLOAD_DIR, f"survey_q{idx+1}_{file_id}_conv.wav")
                try:
                    AudioSegment.from_file(save_path).export(wav_path, format="wav")
                    final_path = wav_path
                    temp_files.append(wav_path)
                except Exception as e:
                    print(f"Warning: Conversion for file {idx+1} failed: {e}")

            # 1. Transcribe audio (STT)
            stt = transcribe_audio(final_path)
            transcript = stt.get("text", "").strip()
            duration = stt.get("duration", 0)

            # 2. Tone analysis
            tone = analyze_tone(final_path)

            answers.append({
                "question": question_text,
                "answer": transcript if transcript else "(No spoken response detected)",
                "duration_sec": duration,
                "tone": tone
            })

        # 3. Comprehensive Gemini / NLP multi-file analysis
        report = analyze_survey_with_gemini(answers, language)
        return report

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Survey audio processing failed: {str(e)}")
    finally:
        # Cleanup temporary files
        for tmp in temp_files:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass


@app.post("/transcribe")
def transcribe_only(file: UploadFile = File(...)):
    """
    Transcribes the uploaded audio file and returns the text.
    """
    allowed = (".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(400, f"Unsupported file type. Allowed: {allowed}")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    final_path = save_path
    
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        root, ext = os.path.splitext(save_path)
        if ext.lower() in (".webm", ".ogg"):
            wav_path = root + "_converted.wav"
            AudioSegment.from_file(save_path).export(wav_path, format="wav")
            final_path = wav_path

        result = transcribe_audio(final_path)
        return {"transcript": result["text"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Transcription failed: {e}")
    finally:
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except:
                pass
        if final_path != save_path and os.path.exists(final_path):
            try:
                os.remove(final_path)
            except:
                pass


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), pulse_bpm: float = Form(None),
                  temp_c: float = Form(None)):
    """
    Receive audio/video + optional pulse rate (bpm) + optional skin temp (°C).
    """
    allowed = (".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm", ".flac")
    if not file.filename.lower().endswith(allowed):
        raise HTTPException(400, f"Unsupported file type. Allowed: {allowed}")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = process_feedback_audio(save_path, pulse_bpm=pulse_bpm, temp_c=temp_c)
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {e}")
    finally:
        os.remove(save_path)

    return result

 
