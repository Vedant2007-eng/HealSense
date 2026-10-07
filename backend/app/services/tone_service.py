import librosa
import numpy as np


def analyze_tone(file_path: str) -> dict:
    """
    Extract vocal tone features from an audio file.
    Heuristic-based: pitch, energy, and pace → emotion signals.
    No external API — fully local.
    """
    # Load audio (librosa handles mp4/m4a/wav/mp3)
    y, sr = librosa.load(file_path, sr=16000)
    duration = len(y) / sr

    # --- 1. Pitch (F0) analysis ---
    f0, voiced_flag, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr)
    f0_valid = f0[~np.isnan(f0)]  # remove unvoiced frames
    mean_pitch = float(np.mean(f0_valid)) if len(f0_valid) else 0.0
    pitch_std = float(np.std(f0_valid)) if len(f0_valid) else 0.0

    # --- 2. Energy (loudness) ---
    rms = librosa.feature.rms(y=y)[0]
    mean_energy = float(np.mean(rms))

    # --- 3. Speaking pace (words per second via transcript length) ---
    # pace is filled in by the pipeline using the transcript

    # --- 4. Map features to tone signals (rule-based heuristics) ---
    signals = []

    # High pitch variation → excitement / agitation / stress
    if pitch_std > 40:
        signals.append("high_pitch_variation")
    # High mean pitch → stress or urgency (baseline ~100-180 Hz)
    if mean_pitch > 200:
        signals.append("raised_pitch")
    # High energy → loud / emphatic speaking
    if mean_energy > 0.05:
        signals.append("high_energy")
    # Low energy → tired, resigned, or soft speech
    if mean_energy < 0.01:
        signals.append("low_energy")

    # --- 5. Distress score (0-1, combines features) ---
    distress = 0.0
    if pitch_std > 40:        distress += 0.3
    if mean_pitch > 200:      distress += 0.3
    if mean_energy > 0.05:    distress += 0.2
    if pitch_std > 60:        distress += 0.2
    distress = min(round(distress, 2), 1.0)

    return {
        "duration_sec": round(duration, 2),
        "mean_pitch_hz": round(mean_pitch, 1),
        "pitch_variation": round(pitch_std, 1),
        "mean_energy": round(mean_energy, 4),
        "tone_signals": signals if signals else ["neutral"],
        "distress_score": distress,
    }
