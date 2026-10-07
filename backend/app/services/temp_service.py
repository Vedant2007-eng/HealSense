def analyze_temperature(temp_c: float) -> dict:
    """
    Estimate physiological stress from peripheral skin temperature (°C).
    Stress → vasoconstriction → cooler peripheral skin.
    Also flags fever (>= 38.0°C) as a medical signal.
    """
    try:
        temp_c = float(temp_c)
    except (TypeError, ValueError):
        return {"temp_c": None, "temp_state": "unknown",
                "stress_signals": ["invalid_input"], "temp_stress_score": 0.0}

    if temp_c < 20 or temp_c > 45:
        return {"temp_c": temp_c, "temp_state": "implausible",
                "stress_signals": ["invalid_range"], "temp_stress_score": 0.0}

    signals = []

    # Fever check (medical, not stress)
    fever = temp_c >= 38.0
    if fever:
        signals.append("fever_detected")

    # Vasoconstriction (peripheral cooling) → stress
    if temp_c >= 34.0:
        state, score = "warm_relaxed", 0.0
    elif temp_c >= 32.1:
        state, score = "cool", 0.2
        signals.append("peripheral_cooling")
    elif temp_c >= 30.0:
        state, score = "cold", 0.4
        signals.append("peripheral_cooling")
    else:
        state, score = "very_cold", 0.6
        signals.append("strong_peripheral_cooling")

    return {
        "temp_c": temp_c,
        "temp_state": state,
        "fever": fever,
        "stress_signals": signals,
        "temp_stress_score": score,
    }
