def calculate_multimodal_patient_score(
    nlp_priority: str,
    tone_distress: float = 0.0,
    pulse_stress: float = 0.0,
    temp_stress: float = 0.0,
    facial_distress: bool = False
) -> dict:
    """
    Computes a unified HealSense Patient Alert & Triage Score.
    Fuses Text NLP Priority + Vocal Tone Distress + Pulse Stress + Temperature Stress + Facial Distress.
    """
    priority_map = {"URGENT": 0.9, "HIGH": 0.7, "MEDIUM": 0.4, "LOW": 0.1}
    base = priority_map.get(nlp_priority.upper(), 0.1)

    face_score = 0.25 if facial_distress else 0.0

    raw_alert = base + (0.3 * tone_distress) + (0.25 * pulse_stress) + (0.25 * temp_stress) + (0.2 * face_score)
    final_alert = round(min(raw_alert, 1.0), 2)

    if final_alert >= 0.8:
        final_priority = "URGENT"
    elif final_alert >= 0.6:
        final_priority = "HIGH"
    elif final_alert >= 0.35:
        final_priority = "MEDIUM"
    else:
        final_priority = "LOW"

    return {
        "alert_score": final_alert,
        "final_priority": final_priority,
        "component_weights": {
            "nlp_base": base,
            "tone_distress": round(tone_distress, 2),
            "pulse_stress": round(pulse_stress, 2),
            "temp_stress": round(temp_stress, 2),
            "facial_distress": facial_distress
        }
    }
