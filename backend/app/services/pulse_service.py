def analyze_pulse(pulse_bpm: float) -> dict:
    """
    Estimate physiological stress from pulse rate (bpm).
    """
    try:
        pulse_bpm = float(pulse_bpm)
    except (TypeError, ValueError):
        return {"pulse_bpm": None, "pulse_zone": "unknown",
                "stress_signals": ["invalid_input"], "pulse_stress_score": 0.0}

    if pulse_bpm < 40 or pulse_bpm > 220:
        return {"pulse_bpm": pulse_bpm, "pulse_zone": "implausible",
                "stress_signals": ["invalid_range"], "pulse_stress_score": 0.0}

    # Zone classification
    if pulse_bpm <= 80:
        zone, score = "resting", 0.0
    elif pulse_bpm <= 95:
        zone, score = "slightly_elevated", 0.2
    elif pulse_bpm <= 110:
        zone, score = "elevated", 0.4
    elif pulse_bpm <= 125:
        zone, score = "high", 0.6
    else:
        zone, score = "very_high", 0.8

    signals = []
    if score >= 0.4:
        signals.append("elevated_heart_rate")

    return {
        "pulse_bpm": pulse_bpm,
        "pulse_zone": zone,
        "stress_signals": signals,
        "pulse_stress_score": score,
    }
