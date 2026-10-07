from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

from app.services.pipeline_service import process_feedback_audio
from app.services.whisper_service import transcribe_audio
from app.services.survey_service import analyze_survey_with_gemini
from pydantic import BaseModel
from typing import List

app = FastAPI(title="HealSense API", version="1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    Receives the 4-question voice survey payload and analyzes it with Gemini.
    """
    if len(payload.answers) != 4:
        raise HTTPException(status_code=400, detail="Expected exactly 4 answers.")
        
    result = analyze_survey_with_gemini([a.dict() for a in payload.answers], payload.language)
    return result

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
            
        # Convert webm/ogg to wav (similar to pipeline_service)
        from pydub import AudioSegment
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
 
