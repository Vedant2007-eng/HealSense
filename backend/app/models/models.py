from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class FeedbackSession(Base):
    __tablename__ = "feedback_sessions"

    id = Column(Integer, primary_key=True, index=True)
    department = Column(String, default="General")          # OPD, Emergency, Pharmacy...
    is_anonymous = Column(Boolean, default=True)
    consent_face_analysis = Column(Boolean, default=False)  # opt-in toggle

    transcript = Column(Text, nullable=True)                # from Whisper
    language = Column(String, default="en")

    # Final results
    happiness_index = Column(Float, nullable=True)          # 0-100
    classification = Column(String, nullable=True)          # Happy / Neutral / Unhappy
    overall_sentiment = Column(String, nullable=True)       # positive / negative / mixed
    priority = Column(String, default="low")                # low / medium / high / critical

    created_at = Column(DateTime, default=utcnow)

    # Relationships
    aspects = relationship("AspectScore", back_populates="session",
                           cascade="all, delete-orphan")
    vocal_tone = relationship("VocalToneResult", back_populates="session",
                              uselist=False, cascade="all, delete-orphan")
    face_emotion = relationship("FaceEmotionResult", back_populates="session",
                                uselist=False, cascade="all, delete-orphan")
    blockchain_record = relationship("BlockchainRecord", back_populates="session",
                                     uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session",
                                   cascade="all, delete-orphan")


class AspectScore(Base):
    """Aspect-based sentiment: one row per aspect mentioned."""
    __tablename__ = "aspect_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"))
    aspect = Column(String)          # Doctor, Billing, Waiting Time, ...
    sentiment = Column(String)       # positive / negative / neutral
    sentiment_score = Column(Float)  # -1.0 to +1.0
    severity = Column(String, default="low")  # low / medium / high / critical
    keywords = Column(Text, nullable=True)    # comma-separated keywords

    session = relationship("FeedbackSession", back_populates="aspects")


class VocalToneResult(Base):
    __tablename__ = "vocal_tone_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"))
    mean_pitch = Column(Float, nullable=True)       # Hz
    speaking_rate = Column(Float, nullable=True)    # words/sec approx
    pause_ratio = Column(Float, nullable=True)      # 0-1
    tone_score = Column(Float, nullable=True)       # 0-100 (100 = calm/positive)

    session = relationship("FeedbackSession", back_populates="vocal_tone")


class FaceEmotionResult(Base):
    __tablename__ = "face_emotion_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"))
    dominant_emotion = Column(String, nullable=True)   # happy, sad, angry, neutral...
    emotion_confidence = Column(Float, nullable=True)  # 0-100
    emotion_score = Column(Float, nullable=True)       # 0-100 mapped mood score

    session = relationship("FeedbackSession", back_populates="face_emotion")


class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"))
    data_hash = Column(String, nullable=False)      # SHA-256 of transcript+scores
    tx_hash = Column(String, nullable=True)         # Polygon transaction hash
    block_number = Column(Integer, nullable=True)
    network = Column(String, default="polygon-amoy")
    anchored_at = Column(DateTime, default=utcnow)

    session = relationship("FeedbackSession", back_populates="blockchain_record")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"))
    text = Column(Text)                     # AI-generated suggestion
    target_aspect = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    session = relationship("FeedbackSession", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)                 # e.g. "viewed_feedback", "exported_data"
    actor = Column(String, default="admin")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
