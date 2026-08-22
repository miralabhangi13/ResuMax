def build_synthetic_jd(role_name: str, role_data: dict) -> str:
    """
    Builds a synthetic Job Description using the selected role taxonomy.
    """

    description = role_data.get("description", "")

    categories = [
        ("Programming Languages", role_data.get("programming_languages", [])),
        ("Frontend Technologies", role_data.get("frontend", [])),
        ("Backend Technologies", role_data.get("backend", [])),
        ("Databases", role_data.get("databases", [])),
        ("Web Technologies", role_data.get("web_technologies", [])),
        ("Cloud", role_data.get("cloud", [])),
        ("DevOps", role_data.get("devops", [])),
        ("Tools", role_data.get("tools", [])),
        ("Computer Science Fundamentals", role_data.get("cs_fundamentals", [])),
        ("Testing", role_data.get("testing", [])),
        ("Soft Skills", role_data.get("soft_skills", [])),
        ("Project Keywords", role_data.get("project_keywords", []))
    ]

    skill_blocks = []

    for category, skills in categories:
        if skills:
            skill_blocks.append(
                f"- {category}: {', '.join(skills)}"
            )

    return f"""
Role Title:
{role_name}

Role Description:
{description}

Required Skills:
{chr(10).join(skill_blocks)}
""".strip()


def build_prompt(
    resume_text: str,
    role_data: dict,
    role_name: str,
    job_description: str = ""
):

    if job_description.strip():
        target = job_description.strip()
        source = "User Job Description"
    else:
        target = build_synthetic_jd(role_name, role_data)
        source = "Synthetic Role Benchmark"

    return f"""
You are an enterprise Applicant Tracking System (ATS) and Senior Technical Recruiter.

Your task is to evaluate the candidate's resume against the target benchmark.

=========================
TARGET BENCHMARK
=========================

Source:
{source}

{target}

=========================
CANDIDATE RESUME
=========================

{resume_text}

=========================
INSTRUCTIONS
=========================

Return ONLY ONE valid JSON object.

Do NOT:
- Return markdown.
- Return explanations.
- Return ```json.
- Return multiple JSON objects.
- Invent skills that are not present or strongly implied.
- Include any text outside the JSON.

Rules:

1. If a Job Description exists, compare the resume against it.
2. Otherwise compare against the synthetic role benchmark.
3. Use only information present in the resume.
4. Scores must be integers between 0 and 100.

Scoring Guidelines (STRICT MATHEMATICAL FORMULA)

Do not grade overly harshly. Start with a baseline of 100 for each category and deduct points objectively based on the criteria below.

technicalScore
- Base: 100 points.
- Deduct exactly 5 points for every major required technical skill missing (Max deduction: 40 points).
- Minimum Guardrail: A candidate possessing at least 50% of the core tech stack MUST score a minimum of 65.

semanticScore
- Base: 100 points.
- Deduct 5 to 10 points if projects and past experience weakly align with the target role domain.
- Deduct up to 10 points if the experience lacks depth or seniority compared to the benchmark.

qualityScore
- Base: 100 points.
- Deduct 5 points if achievements lack quantified metrics (numbers, percentages).
- Deduct 5 points for poor formatting, missing sections, or weak action verbs.

Calculate:

finalScore = round(
technicalScore * 0.40 +
semanticScore * 0.40 +
qualityScore * 0.20
)

Rating Rules

90-100 = Excellent
75-89 = Good
60-74 = Average
0-59 = Needs Improvement

Generate exactly FIVE interview questions based on the candidate's missing skills.

Return EXACTLY this JSON schema:

{{
    "technicalScore": 0,
    "semanticScore": 0,
    "qualityScore": 0,
    "finalScore": 0,
    "rating": "",
    "matchedSkills": [
        "React",
        "Node.js"
    ],
    "missingSkills": [
        "Docker",
        "AWS"
    ],
    "strengths": [
        "Strong MERN development experience"
    ],
    "weaknesses": [
        "Limited cloud experience"
    ],
    "feedback": [
        "Add cloud projects.",
        "Include quantified achievements."
    ],
    "interviewQuestions": [
        "Explain JWT authentication."
    ],
    "summary": "Brief ATS evaluation summary."
}}
""".strip()