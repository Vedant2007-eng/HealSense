from faster_whisper import WhisperModel

# Load model ONCE at import time (lazy singleton pattern)
_model = None

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        # "base" = good accuracy/speed balance for demo.
        # Options: tiny (fastest) / base / small (best accuracy, slower)
        _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe_audio(file_path: str) -> dict:
    """
    Transcribes an audio/video file.
    Returns: {"text": str, "language": str, "duration": float}
    """
    model = get_model()

    segments, info = model.transcribe(file_path, beam_size=5)

    # Join all segments into full transcript
    text_parts = []
    for segment in segments:
        text_parts.append(segment.text.strip())

    full_text = " ".join(text_parts)

    return {
        "text": full_text,
        "language": info.language,       # e.g. "en"
        "duration": round(info.duration, 2),
    }
