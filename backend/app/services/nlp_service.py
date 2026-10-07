_sentiment = None
_zero_shot = None

ASPECTS = ["doctor", "staff", "waiting time", "billing", "cleanliness", "treatment"]


def _get_sentiment():
    global _sentiment
    if _sentiment is None:
        try:
            from transformers import pipeline
            _sentiment = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        except Exception as e:
            print(f"Transformers sentiment model fallback: {e}")
            _sentiment = False
    return _sentiment


def _get_zero_shot():
    global _zero_shot
    if _zero_shot is None:
        try:
            from transformers import pipeline
            _zero_shot = pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli")
        except Exception as e:
            print(f"Zero-shot model fallback: {e}")
            _zero_shot = False
    return _zero_shot


def split_into_sentences(text: str) -> list[str]:
    """Simple sentence splitter."""
    import re
    sentences = re.split(r"[.!?]+", text)
    return [s.strip() for s in sentences if len(s.strip()) > 2]


def analyze_feedback(text: str) -> dict:
    """
    Full NLP analysis of patient feedback.
    Returns aspects with sentiment, overall sentiment, and priority score.
    """
    sentences = split_into_sentences(text)
    if not sentences and text.strip():
        sentences = [text.strip()]

    # Check transformers models
    zsc = _get_zero_shot()
    senti = _get_sentiment()

    mentioned_aspects = []
    sentence_analysis = []

    if zsc and senti:
        try:
            aspect_result = zsc(text, candidate_labels=ASPECTS, multi_label=True)
            mentioned_aspects = [
                {"aspect": label, "relevance": round(score, 2)}
                for label, score in zip(aspect_result["labels"], aspect_result["scores"])
                if score > 0.5
            ]

            for sentence in sentences:
                result = senti(sentence)[0]
                sentence_analysis.append({
                    "sentence": sentence,
                    "sentiment": result["label"],
                    "confidence": round(result["score"], 2),
                })
        except Exception as e:
            print(f"NLP model prediction fallback: {e}")
            zsc = False

    if not sentence_analysis:
        # Fast rule-based NLP fallback
        pos_words = ["good", "great", "excellent", "nice", "clean", "satisfied", "helpful", "polite", "timely", "cared"]
        neg_words = ["bad", "poor", "dirty", "unclean", "rude", "late", "delayed", "pain", "worst", "unhelpful", "neglect"]

        for sentence in sentences:
            s_lower = sentence.lower()
            pos_hits = sum(1 for w in pos_words if w in s_lower)
            neg_hits = sum(1 for w in neg_words if w in s_lower)
            label = "NEGATIVE" if neg_hits > pos_hits else "POSITIVE"
            sentence_analysis.append({
                "sentence": sentence,
                "sentiment": label,
                "confidence": 0.85
            })

        for aspect in ASPECTS:
            if aspect in text.lower():
                mentioned_aspects.append({"aspect": aspect, "relevance": 0.88})

    pos_score = sum(s["confidence"] for s in sentence_analysis if s["sentiment"] == "POSITIVE")
    neg_score = sum(s["confidence"] for s in sentence_analysis if s["sentiment"] == "NEGATIVE")
    total = pos_score + neg_score
    overall = "POSITIVE" if pos_score >= neg_score else "NEGATIVE"
    overall_confidence = round(max(pos_score, neg_score) / total, 2) if total else 0.8

    priority = "LOW"
    critical_keywords = ["billing", "staff", "waiting", "rude", "unhelpful", "overcharged", "mistake", "dirty", "pain"]
    hits = [kw for kw in critical_keywords if kw in text.lower()]
    
    if overall == "NEGATIVE":
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
        "flagged_topics": hits,
    }

