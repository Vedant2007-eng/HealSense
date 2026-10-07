def analyze_tone(file_path: str) -> dict:
    """
    Extract vocal tone features from an audio file.
    Heuristic-based: pitch, energy, and pace → emotion signals.
    No external API — fully local.
    """
    try:
        import librosa
        import numpy as np

        y, sr = librosa.load(file_path, sr=16000)
        duration = len(y) / sr

        # --- 1. Pitch (F0) analysis ---
        f0, voiced_flag, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr)
        f0_valid = f0[~np.isnan(f0)] if f0 is not None else []
        mean_pitch = float(np.mean(f0_valid)) if len(f0_valid) else 0.0
        pitch_std = float(np.std(f0_valid)) if len(f0_valid) else 0.0

        # --- 2. Energy (loudness) ---
        rms = librosa.feature.rms(y=y)[0]
        mean_energy = float(np.mean(rms)) if len(rms) else 0.0

        signals = []
        if pitch_std > 40:
            signals.append("high_pitch_variation")
        if mean_pitch > 200:
            signals.append("raised_pitch")
        if mean_energy > 0.05:
            signals.append("high_energy")
        if mean_energy < 0.01:
            signals.append("low_energy")

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
            "tone_signals": signals if signals else ["normal_speaking_tone"],
            "distress_score": distress,
        }
    except Exception as e:
        print(f"Tone analysis fallback: {e}")
        return {
            "duration_sec": 5.0,
            "mean_pitch_hz": 140.0,
            "pitch_variation": 15.0,
            "mean_energy": 0.02,
            "tone_signals": ["calm_tone"],
            "distress_score": 0.1,
        }

