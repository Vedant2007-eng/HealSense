from app.services.pipeline_service import process_feedback_audio
import json

result = process_feedback_audio("test_audio.mp4")

print("=" * 55)
print("       HealSense Intelligence Report")
print("=" * 55)
print(f"Language        : {result['language']}")
print(f"Duration        : {result['duration_sec']} sec")
print(f"Transcript      : {result['transcript']}")
print(f"Sentiment       : {result['overall_sentiment']} ({result['overall_confidence']})")
print(f"Flagged topics  : {result['flagged_topics']}")
print(f"Speaking pace   : {result['speaking_pace_wps']} words/sec")
print(f"Distress score  : {result['tone']['distress_score']}")
print(f"Alert score     : {result['alert_score']}")
print(f"FINAL PRIORITY  : {result['final_priority']}")
print("-" * 55)
print("Aspects:")
for a in result["aspects_mentioned"]:
    print(f"  - {a['aspect']} (relevance {a['relevance']})")
print("=" * 55)
print("\nFull JSON (as the API will return it):")
print(json.dumps(result, indent=2))
