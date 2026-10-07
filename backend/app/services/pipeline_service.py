import os
from pydub import AudioSegment

from app.services.whisper_service import transcribe_audio
from app.services.nlp_service import analyze_feedback
from app.services.tone_service import analyze_tone
from app.services.pulse_service import analyze_pulse
from app.services.temp_service import analyze_temperature


def process_feedback_audio(file_path: str, pulse_bpm=None, temp_c=None) -> dict:
    """
    The full HealSense pipeline:
    Audio → Transcript → Aspect Sentiment → Tone + Pulse + Temp → Combined Report
    """
    # Convert webm/ogg recordings to wav so librosa can read them
    root, ext = os.path.splitext(file_path)
    if ext.lower() in (".webm", ".ogg"):
        wav_path = root + "_converted.wav"
        AudioSegment.from_file(file_path).export(wav_path, format="wav")
        file_path = wav_path

    # --- Stage 1: Speech-to-Text ---
    stt = transcribe_audio(file_path)
    text = stt["text"]
    language = stt["language"]

    # --- Stage 2: NLP ---
    nlp = analyze_feedback(text)

    # --- Stage 3: Vocal tone ---
    tone = analyze_tone(file_path)

    # --- Stage 4: Pulse ---
    pulse = analyze_pulse(pulse_bpm) if pulse_bpm else {
        "pulse_bpm": None, "pulse_zone": "not_provided",
        "stress_signals": [], "pulse_stress_score": 0.0}

    # --- Stage 4b: Temperature ---
    temp = analyze_temperature(temp_c) if temp_c else {
        "temp_c": None, "temp_state": "not_provided", "fever": False,
        "stress_signals": [], "temp_stress_score": 0.0}

    # --- Fusion ---
    word_count = len(text.split())
    pace = round(word_count / stt["duration"], 2) if stt["duration"] > 0 else 0

    severity_map = {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.8}
    base = severity_map.get(nlp["complaint_priority"], 0.2)

    # Text + tone + pulse + temp fusion (capped at 1.0)
    alert_score = round(min(
        base + tone["distress_score"] + pulse["pulse_stress_score"]
        + temp["temp_stress_score"], 1.0), 2)

    if alert_score >= 0.8:
        final_priority = "URGENT"
    else:
        final_priority = nlp["complaint_priority"]

    # Clean up temporary converted file
    if "_converted" in file_path and os.path.exists(file_path):
        os.remove(file_path)

    return {
        "language": language,
        "transcript": text,
        "duration_sec": stt["duration"],
        "overall_sentiment": nlp["overall_sentiment"],
        "overall_confidence": nlp["overall_confidence"],
        "aspects_mentioned": nlp["aspects_mentioned"],
        "sentence_analysis": nlp["sentence_analysis"],
        "flagged_topics": nlp["flagged_topics"],
        "tone": tone,
        "pulse": pulse,
        "temperature": temp,
        "speaking_pace_wps": pace,
        "alert_score": alert_score,
        "final_priority": final_priority,
    }
