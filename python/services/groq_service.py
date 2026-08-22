import os
import json
import traceback

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")

client = Groq(api_key=api_key)


SYSTEM_PROMPT = """
You are an expert ATS (Applicant Tracking System) resume analyzer.

Rules:
1. Always analyze the resume professionally and objectively.
2. If Job Description is empty, evaluate using the selected role.

CALCULATE SCORES USING THIS EXACT MATHEMATICAL FORMULA:
- Base Score: Start every resume at 100 points.
- Missing Skills Penalty: Deduct exactly 5 points for every major missing skill (maximum deduction: 30 points).
- Quality Penalty: Deduct 2 to 5 points for poor formatting, grammar, or lack of quantifiable metrics.
- Semantic Bonus: Add up to 10 points if their past experience heavily aligns with the required domain.
- Minimum Score Guardrail: A candidate who has at least 50% of the required skills MUST score a minimum of 65. Do not grade overly harshly.

SCORING RUBRIC (Map the Final Score to these ratings):
- 85-100 (Excellent): Strong match.
- 70-84 (Good): Solid candidate.
- 50-69 (Average): Missing some key requirements.
- 0-49 (Poor): Completely mismatched.
"""


def analyze_resume_with_groq(prompt):
    try:
        model_name = "openai/gpt-oss-120b"
        
        print(f"1. Sending request to Groq using model: {model_name}")
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=4096,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "resume_analysis",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "technicalScore": {"type": "integer"},
                            "semanticScore": {"type": "integer"},
                            "qualityScore": {"type": "integer"},
                            "finalScore": {"type": "integer"},
                            "rating": {"type": "string"},
                            "matchedSkills": {"type": "array", "items": {"type": "string"}},
                            "missingSkills": {"type": "array", "items": {"type": "string"}},
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "weaknesses": {"type": "array", "items": {"type": "string"}},
                            "feedback": {"type": "array", "items": {"type": "string"}},
                            "interviewQuestions": {"type": "array", "items": {"type": "string"}},
                            "summary": {"type": "string"}
                        },
                        "required": [
                            "technicalScore", "semanticScore", "qualityScore", "finalScore", 
                            "rating", "matchedSkills", "missingSkills", "strengths", 
                            "weaknesses", "feedback", "interviewQuestions", "summary"
                        ],
                        "additionalProperties": False
                    }
                }
            }
        )

        content = response.choices[0].message.content

        parsed_json = json.loads(content)
        
        return parsed_json

    except Exception as e:
        
        return {
            "error": str(e),
            "finalScore": 0, 
            "technicalScore": 0,
            "semanticScore": 0,
            "qualityScore": 0,
            "rating": "Error",
            "matchedSkills": [],
            "missingSkills": [],
            "strengths": [],
            "weaknesses": [],
            "feedback": [],
            "interviewQuestions": [],
            "summary": f"API ERROR: {str(e)}"
        }

def chat_with_groq(prompt):
    print("\n========== AI CHAT DEBUG START ==========")
    try:
        # Switch to Llama 3.3 for chat - it doesn't waste tokens on hidden thinking!
        model_name = "openai/gpt-oss-120b"
        
        print(f"1. Sending chat request using model: {model_name}")

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": """
You are an elite, purely analytical ATS engine.

ABSOLUTE MANDATORY RULES:
1. NO PREAMBLE: NEVER output any introductory or concluding sentences. 
2. START IMMEDIATELY: Your very first character must be a bullet point (-).
3. BULLET POINTS ONLY: Output exactly 3 to 4 bullet points. No paragraphs.
4. ONE SENTENCE PER BULLET: Keep it extremely short and direct.
5. FORMATTING: Use the exact format `- **[Action]**: [Specific advice].`

EXAMPLE OUTPUT (MATCH THIS EXACTLY):
- **Quantify Impact**: Update the Shopora project to state "handled 10k+ users" to boost the quality score.
- **Add Cloud Skills**: Include "Familiar with AWS EC2 and Docker" in your skills section.
- **Inject Testing Tools**: Mention "Jest" or "Mocha" in your web technologies list to pass testing checks.
"""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1, 
            max_tokens=300   # Perfect amount of space for 3-4 bullet points
        )

        answer = response.choices[0].message.content

        print("\n2. CHAT REPLY GENERATED SUCCESSFULLY!")
        print("========== AI CHAT DEBUG END ==========\n")

        return answer

    except Exception as e:
        print("\n!!! ERROR IN CHAT API CALL !!!")
        print(traceback.format_exc())
        print("========== AI CHAT DEBUG END ==========\n")
        raise e