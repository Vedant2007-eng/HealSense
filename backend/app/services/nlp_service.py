from transformers import pipeline

# Lazy-loaded singletons (load once, reuse after)
_sentiment = None
_zero_shot = None

ASPECTS = ["doctor", "staff", "waiting time", "billing", "cleanliness", "treatment"]


def _get_sentiment():
    global _sentiment
    if _sentiment is None:
        # DistilBERT fine-tuned on SST-2 — small, fast, accurate
        _sentiment = pipeline("sentiment-analysis",
                              model="distilbert-base-uncased-finetuned-sst-2-english")
    return _sentiment


def _get_zero_shot():
    global _zero_shot
    if _zero_shot is None:
        # Compact NLI model (~270 MB) — aspect detection for HealSense
        _zero_shot = pipeline("zero-shot-classification",
                              model="typeform/distilbert-base-uncased-mnli")
    return _zero_shot


def split_into_sentences(text: str) -> list[str]:
    """Simple sentence splitter (avoids extra dependencies)."""
    import re
    sentences = re.split(r"[.!?]+", text)
    return [s.strip() for s in sentences if len(s.strip()) > 2]


def analyze_feedback(text: str) -> dict:
    """
    Full NLP analysis of patient feedback.
    Returns aspects with sentiment, overall sentiment, and priority score.
    """
    sentences = split_into_sentences(text)

    # --- 1. Detect which aspects are mentioned (zero-shot classification) ---
    zsc = _get_zero_shot()
    aspect_result = zsc(text, candidate_labels=ASPECTS, multi_label=True)
    mentioned_aspects = [
        {"aspect": label, "relevance": round(score, 2)}
        for label, score in zip(aspect_result["labels"], aspect_result["scores"])
        if score > 0.5  # keep only clearly mentioned aspects
    ]

    # --- 2. Sentence-level sentiment ---
    senti = _get_sentiment()
    sentence_analysis = []
    for sentence in sentences:
        result = senti(sentence)[0]  # e.g. {"label": "POSITIVE", "score": 0.99}
        sentence_analysis.append({
            "sentence": sentence,
            "sentiment": result["label"],          # POSITIVE / NEGATIVE
            "confidence": round(result["score"], 2),
        })

    # --- 3. Overall sentiment (weighted by confidence) ---
    pos_score = sum(s["confidence"] for s in sentence_analysis if s["sentiment"] == "POSITIVE")
    neg_score = sum(s["confidence"] for s in sentence_analysis if s["sentiment"] == "NEGATIVE")
    total = pos_score + neg_score
    overall = "POSITIVE" if pos_score >= neg_score else "NEGATIVE"
    overall_confidence = round(max(pos_score, neg_score) / total, 2) if total else 0.5

    # --- 4. Complaint priority (for hospital triage) ---
    # High if: strongly negative + billing/waiting/staff involved
    priority = "LOW"
    negative_aspects = []
    if overall == "NEGATIVE":
        critical_keywords = ["billing", "staff", "waiting", "rude", "unhelpful", "overcharged", "mistake"]
        hits = [kw for kw in critical_keywords if kw in text.lower()]
        negative_aspects = hits
        if neg_score >= 0.9 and len(hits) >= 2:
            priority = "HIGH"
        elif neg_score >= 0.7:
            priority = "MEDIUM"

    return {
        "overall_sentiment": overall,
        "overall_confidence": overall_confidence,
        "aspects_mentioned": mentioned_aspects,
        "sentence_analysis": sentence_analysis,
        "complaint_priority": priority,
        "flagged_topics": negative_aspects,
    }
