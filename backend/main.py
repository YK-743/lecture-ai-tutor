import json
import os
from urllib.parse import parse_qs, urlparse

import requests
import yt_dlp
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi

# Load variables from .env
load_dotenv()

app = FastAPI()

CUSTOM_GPT_URL = (
    "https://chatgpt.com/g/g-6a0bfd3a767c8191bc7e6cf272e81bb3-lecture-ai-tutor"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home route
@app.get("/")
def home():
    return {"message": "Lecture AI Tutor backend is running"}


# Models
class TranscriptRequest(BaseModel):
    youtube_url: str


class AnalyzeRequest(BaseModel):
    transcript: str


# Extract video ID
def extract_video_id(youtube_url: str):
    parsed_url = urlparse(youtube_url)

    if parsed_url.netloc in ["www.youtube.com", "youtube.com"]:
        query_params = parse_qs(parsed_url.query)
        video_id = query_params.get("v")

        if video_id:
            return video_id[0]

    if parsed_url.netloc == "youtu.be":
        video_id = parsed_url.path.strip("/")

        if video_id:
            return video_id

    return None


# Fetch transcript
def fetch_youtube_transcript(youtube_url: str):
    video_id = extract_video_id(youtube_url)

    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL."
        )

    api_key = os.getenv("SUPADATA_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="SUPADATA_API_KEY missing."
        )

    try:
        url = f"https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}"

        headers = {
            "x-api-key": api_key
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=30
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Transcript API error: {response.text}"
            )

        data = response.json()

        transcript_text = " ".join(
            [item["text"] for item in data.get("transcript", [])]
        )

        if not transcript_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No transcript found."
            )

        return {
            "video_id": video_id,
            "transcript": transcript_text
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch transcript: {str(e)}"
        )

# Analyze transcript with OpenRouter
def analyze_text_with_openrouter(transcript: str):
    transcript = transcript.strip()

    if len(transcript) < 50:
        raise HTTPException(
            status_code=400,
            detail="Transcript is too short.",
        )

    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

    if not openrouter_api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY is missing.",
        )

    prompt = f"""
You are a beginner-friendly coding tutor.

Analyze this coding lecture transcript and generate structured study material.

Return only valid JSON with exactly these keys:
- topics
- simple_explanation
- quick_notes
- detailed_notes
- practice_questions
- syntax_cheat_sheet

Requirements:
- topics must be an array of strings in the exact order they appear.
- simple_explanation must be a beginner-friendly string.
- quick_notes must be an array of short revision notes.
- detailed_notes must be an array of detailed study notes.
- practice_questions must be an array of beginner-friendly questions.
- syntax_cheat_sheet must be an array of syntax tips if code or syntax appears.

Transcript:
{transcript}
"""

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {openrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://lecture-ai-tutor-backend.onrender.com",
                "X-Title": "Lecture AI Tutor",
            },
            json={
                "model": "openrouter/auto",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful coding tutor. Always return valid JSON only.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                "response_format": {
                    "type": "json_object",
                },
            },
            timeout=60,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"OpenRouter error: {response.text}",
            )

        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        analysis = json.loads(content)

        return analysis

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="OpenRouter response was not valid JSON.",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not analyze transcript: {str(e)}",
        )


# Teaching prompt
def create_teaching_prompt(transcript: str):
    return f"""
Teach me this lecture transcript step-by-step.

My level: Beginner

Rules:
- Teach slowly
- Use examples
- Ask questions
- Quiz me
- Only teach from this lecture
- Wait for my response often
- Don't overload me

Lecture Transcript:

{transcript}
"""


# Routes
@app.post("/transcript")
def get_transcript(request: TranscriptRequest):
    return fetch_youtube_transcript(request.youtube_url)


@app.post("/analyze")
def analyze_transcript(request: AnalyzeRequest):
    return analyze_text_with_openrouter(request.transcript)


@app.post("/analyze-youtube")
def analyze_youtube(request: TranscriptRequest):
    transcript_result = fetch_youtube_transcript(request.youtube_url)

    analysis = analyze_text_with_openrouter(
        transcript_result["transcript"]
    )

    return {
        "video_id": transcript_result["video_id"],
        "transcript": transcript_result["transcript"],
        "analysis": analysis,
    }


@app.post("/prepare-learning")
def prepare_learning(request: TranscriptRequest):
    transcript_result = fetch_youtube_transcript(request.youtube_url)

    teaching_prompt = create_teaching_prompt(
        transcript_result["transcript"]
    )

    return {
        "video_id": transcript_result["video_id"],
        "transcript": transcript_result["transcript"],
        "teaching_prompt": teaching_prompt,
        "custom_gpt_url": CUSTOM_GPT_URL,
    }