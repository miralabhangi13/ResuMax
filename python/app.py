from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import json
print("ok")
import os
load_dotenv()
groq_key = os.getenv("GROQ_API_KEY")
from services.role_loader import get_role
from services.prompt_builder import build_prompt
from services.groq_service import analyze_resume_with_groq, chat_with_groq

app = FastAPI()


class ResumeRequest(BaseModel):
    resumeText: str
    role: str
    jobDescription: str = ""


@app.get("/")
def home():
    return {
        "message": "ResuMax Python API is running"
    }


@app.post("/analyze")
def analyze_resume(data: ResumeRequest):

    role_data = get_role(data.role)

    if role_data is None:
        return {
            "status": "error",
            "message": "Invalid role selected"
        }

    prompt = build_prompt(
        resume_text=data.resumeText,
        role_data=role_data,
        role_name=data.role,
        job_description=data.jobDescription
    )

    try:
        result = analyze_resume_with_groq(prompt)

        return {
            "status": "success",
            **result
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


    
@app.post("/chat")
def chat_with_resume(data: dict):
    resume_text = data.get("resumeText", "")
    analysis = data.get("analysis", {})
    message = data.get("message", "")

    # ONLY pass the raw data. 
    # All the behavioral rules are safely handled inside groq_service.py!
    prompt = f"""
CANDIDATE RESUME:
{resume_text}

ATS ANALYSIS JSON:
{json.dumps(analysis, indent=2)}

USER QUESTION:
{message}
"""

    try:
        result = chat_with_groq(prompt)

        return {
            "status": "success",
            "reply": result
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }